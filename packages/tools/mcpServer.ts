// MCP Streamable HTTP server — Bun + @modelcontextprotocol/server (v2, beta)
// Confirmed installed: @modelcontextprotocol/server@2.0.0-beta.4
//
// Uses createMcpHandler, the SDK's documented entry point for HTTP
// deployments: it serves 2026-07-28 per request and falls back to
// 2025-11-25 handshake behavior for older clients on the same endpoint.
// handler.fetch is (Request) => Promise<Response>, so it plugs into
// Bun.serve directly with no framework in between.
//
// REQUIRES: bun add @cfworker/json-schema  (confirmed NOT currently
// installed — fromJsonSchema() will throw at import until this is added)
//
// Run: bun run mcpServer.ts
import path from 'node:path';

import {
    McpServer,
    createMcpHandler,
    fromJsonSchema,
    hostHeaderValidationResponse,
    originValidationResponse,
    localhostAllowedHostnames,
    localhostAllowedOrigins
} from '@modelcontextprotocol/server';

import registryData from './registry.json';

// ---- registry.json (Coda2's update-registry.ts output) --------------------

interface RegistryEntry {
    name: string;
    description: string;
    entry: string;
    parameters: Record<string, unknown>; // raw JSON Schema from manifest.json
    importPath: string; // relative to packages/tools
}

const registry = registryData as RegistryEntry[];
const TOOLS_ROOT = path.join(process.cwd(), 'packages/tools');

// ---- tool module contract ---------------------------------------------------
// CONFIRMED from packages/tools/smoke/index.ts: tools export a named
// function called `run`, not `default` and not `execute`. (Both prior
// drafts guessed wrong here — neither would have loaded a single tool.)
// If any tool module uses a different convention, extend this check rather
// than assume uniformity across all 8 registry entries.

type ToolFn = (args: unknown) => Promise<unknown> | unknown;

interface LoadedTool extends RegistryEntry {
    fn: ToolFn;
}

async function loadTool(entry: RegistryEntry): Promise<LoadedTool> {
    const mod = await import(path.join(TOOLS_ROOT, entry.importPath));

    const fn: ToolFn | undefined = typeof mod.run === 'function' ? mod.run : undefined;

    if (!fn) {
        throw new Error(
            `Tool "${entry.name}" (${entry.importPath}) does not export a "run" ` +
                `function. Confirmed convention is: export async function run(params). ` +
                `Fix the module or extend loadTool()'s check if this tool differs.`
        );
    }

    return { ...entry, fn };
}

// Loaded once at process start, cached, and reused by every buildServer()
// call. registry.json only changes when scripts/update-registry.ts reruns.
let loadedToolsPromise: Promise<LoadedTool[]> | undefined;

function getLoadedTools(): Promise<LoadedTool[]> {
    if (!loadedToolsPromise) {
        loadedToolsPromise = Promise.all(registry.map(loadTool));
    }
    return loadedToolsPromise;
}

// ---- server factory ---------------------------------------------------------
// createMcpHandler calls this once per HTTP request (2026-07-28 leg) and
// once per legacy request. Same factory backs both eras.

async function buildServer(): Promise<McpServer> {
    const server = new McpServer({ name: 'coda2-tools-server', version: '1.0.0' });
    const tools = await getLoadedTools();

    for (const tool of tools) {
        server.registerTool(
            tool.name,
            {
                title: tool.name,
                description: tool.description,
                // tool.parameters is raw JSON Schema from manifest.json.
                // fromJsonSchema() is confirmed real (typescript-sdk issue
                // #2093) but requires @cfworker/json-schema, confirmed NOT
                // installed in this repo as of this check. Install it before
                // running, or this throws at import time.
                inputSchema: fromJsonSchema(tool.parameters)
            },
            async (args: unknown) => {
                try {
                    const result = await tool.fn(args);
                    return {
                        content: [{ type: 'text' as const, text: JSON.stringify(result) }]
                    };
                } catch (error) {
                    return {
                        content: [
                            {
                                type: 'text' as const,
                                text: `Failed: ${error instanceof Error ? error.message : String(error)}`
                            }
                        ],
                        isError: true
                    };
                }
            }
        );
    }

    return server;
}

const handler = createMcpHandler(buildServer, {
    // STILL UNCONFIRMED as of this file: a `legacy: 'stateless'` option was
    // proposed in another draft. package.json confirms 2.0.0-beta.4 is
    // installed, but the `grep -r "legacy" .../dist/*.d.ts` check came back
    // "no matches" because v2 ships .d.mts, not .d.ts (per the SDK's own
    // release notes on output-extension normalization) — so that check
    // hasn't actually run yet. Re-run against *.d.mts before adding this
    // option back in either direction.
    onerror: (err: unknown) => console.error('MCP handler error:', err)
});

// ---- HTTP server ------------------------------------------------------------
// createMcpHandler is deliberately validation-free (per its own docs) —
// Origin/Host checks belong in front of it.
//
// STILL UNCONFIRMED: the exact argument shape for the two calls below
// (object like { allowedHosts } vs. plain string[]) — the *.d.ts grep for
// this came back empty for the same reason as above (wrong extension).
// Re-run against *.d.mts to confirm before trusting either shape.

const MCP_PATH = '/mcp';

const server = Bun.serve({
    port: Number(process.env.PORT ?? 5555),
    async fetch(req) {
        const url = new URL(req.url);
        if (url.pathname !== MCP_PATH) {
            return new Response('Not found', { status: 404 });
        }

        const rejected =
            hostHeaderValidationResponse(req, localhostAllowedHostnames()) ??
            originValidationResponse(req, localhostAllowedOrigins());
        if (rejected) return rejected;

        return handler.fetch(req);
    }
});

// Fail fast at boot if any tool module is missing or malformed.
await getLoadedTools();

console.log(
    `MCP Streamable HTTP server (v2, protocol 2026-07-28) listening on http://localhost:${server.port}${MCP_PATH}`
);

process.on('SIGINT', async () => {
    await handler.close();
    process.exit(0);
});