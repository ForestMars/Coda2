/**
 * Coda2's MCP Streamable HTTP server.
 *
 * The same server can run inside the Coda2 workspace or as the standalone
 * toolserver image. TOOLSERVER_TOOL_ALLOWLIST restricts the published surface
 * without changing the canonical tool registry.
 */
import path from 'node:path';

import {
  McpServer,
  createMcpHandler,
  fromJsonSchema,
  hostHeaderValidationResponse,
  originValidationResponse,
  localhostAllowedHostnames,
  localhostAllowedOrigins,
} from '@modelcontextprotocol/server';

import registryData from './registry.json';

interface RegistryEntry {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  importPath: string;
}

type ToolFn = (args: unknown) => Promise<unknown> | unknown;

interface LoadedTool extends RegistryEntry {
  fn: ToolFn;
}

const DEBUG = process.env.DEBUG === 'true';
const MCP_PATH = '/mcp';
const HEALTH_PATH = '/healthz';
const PORT = Number(process.env.PORT ?? 5555);
const HOST = process.env.HOST ?? '0.0.0.0';
const TOOLS_ROOT = path.join(process.cwd(), 'packages/tools');
const registry = registryData as RegistryEntry[];

function csv(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function logDebug(message: string, data?: Record<string, unknown>): void {
  if (!DEBUG) return;
  console.log(JSON.stringify({
    level: 'debug',
    timestamp: new Date().toISOString(),
    message,
    ...data,
  }));
}

function logError(message: string, error?: unknown): void {
  console.error(JSON.stringify({
    level: 'error',
    timestamp: new Date().toISOString(),
    message,
    error: error instanceof Error ? error.message : error === undefined ? undefined : String(error),
  }));
}

function allowedRegistryEntries(): RegistryEntry[] {
  const configured = process.env.TOOLSERVER_TOOL_ALLOWLIST;
  if (configured === undefined) return registry;

  const names = new Set(csv(configured));
  const unknown = [...names].filter((name) => !registry.some((entry) => entry.name === name));
  if (unknown.length > 0) {
    throw new Error(`TOOLSERVER_TOOL_ALLOWLIST contains unknown tools: ${unknown.join(', ')}`);
  }

  return registry.filter((entry) => names.has(entry.name));
}

function sanitizeSchema(params: unknown): Record<string, unknown> {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return { type: 'object', properties: {} };
  }

  const schema = { ...(params as Record<string, unknown>) };
  if (!schema.type) schema.type = 'object';
  if (!schema.properties && schema.type === 'object') schema.properties = {};
  return schema;
}

let loadedToolsPromise: Promise<LoadedTool[]> | undefined;

async function loadTool(entry: RegistryEntry): Promise<LoadedTool> {
  const modulePath = path.join(TOOLS_ROOT, entry.importPath);
  const mod = await import(modulePath);
  if (typeof mod.run !== 'function') {
    throw new Error(`Tool "${entry.name}" does not export a run function (${entry.importPath})`);
  }
  return { ...entry, fn: mod.run as ToolFn };
}

function getLoadedTools(): Promise<LoadedTool[]> {
  if (!loadedToolsPromise) {
    loadedToolsPromise = (async () => {
      const selected = allowedRegistryEntries();
      const seen = new Set<string>();
      for (const entry of registry) {
        if (seen.has(entry.name)) throw new Error(`Duplicate tool name in registry: ${entry.name}`);
        seen.add(entry.name);
      }
      const tools = await Promise.all(selected.map(loadTool));
      logDebug('Loaded MCP tools', { tools: tools.map((tool) => tool.name) });
      return tools;
    })();
  }
  return loadedToolsPromise;
}

async function buildServer(): Promise<McpServer> {
  const server = new McpServer({ name: 'coda2-toolserver', version: '0.1.0' });
  for (const tool of await getLoadedTools()) {
    server.registerTool(
      tool.name.replace(/\//g, '_'),
      {
        title: tool.name,
        description: tool.description,
        inputSchema: fromJsonSchema(sanitizeSchema(tool.inputSchema)),
      },
      async (args: unknown) => {
        const started = performance.now();
        try {
          const result = await tool.fn(args);
          logDebug('Tool executed', {
            tool: tool.name,
            durationMs: Number((performance.now() - started).toFixed(2)),
          });
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(result) }],
          };
        } catch (error) {
          logError(`Tool execution failed: ${tool.name}`, error);
          return {
            content: [{
              type: 'text' as const,
              text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
            }],
            isError: true,
          };
        }
      },
    );
  }
  return server;
}

const handler = createMcpHandler(buildServer, {
  onerror: (error: unknown) => logError('MCP handler error', error),
});

const allowedHostnames = [
  ...new Set([...localhostAllowedHostnames(), ...csv(process.env.MCP_ALLOWED_HOSTS)]),
];
const allowedOrigins = [
  ...new Set([...localhostAllowedOrigins(), ...csv(process.env.MCP_ALLOWED_ORIGINS)]),
];

// Fail fast before binding the listening socket if registry entries are invalid
// or a requested allowlist entry cannot be loaded.
await getLoadedTools();

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error(`PORT must be an integer from 1 to 65535; received ${process.env.PORT}`);
}

const server = Bun.serve({
  hostname: HOST,
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const started = performance.now();

    const hostValidation = hostHeaderValidationResponse(req, allowedHostnames);
    if (hostValidation) return hostValidation;

    const originValidation = originValidationResponse(req, allowedOrigins);
    if (originValidation) return originValidation;

    if (url.pathname === HEALTH_PATH && req.method === 'GET') {
      return Response.json({ status: 'ok' });
    }

    if (url.pathname !== MCP_PATH) {
      return new Response('Not found', { status: 404 });
    }

    try {
      const response = await handler.fetch(req);
      logDebug('MCP request completed', {
        method: req.method,
        status: response.status,
        durationMs: Number((performance.now() - started).toFixed(2)),
      });
      return response;
    } catch (error) {
      logError('MCP request failed', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
});

console.log(JSON.stringify({
  level: 'info',
  message: 'MCP toolserver listening',
  host: HOST,
  port: server.port,
  path: MCP_PATH,
  health: HEALTH_PATH,
  tools: (await getLoadedTools()).map((tool) => tool.name),
}));

async function shutdown(signal: string): Promise<void> {
  console.log(JSON.stringify({ level: 'info', message: 'Shutting down MCP toolserver', signal }));
  try {
    await handler.close();
  } finally {
    server.stop(true);
    process.exit(0);
  }
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
