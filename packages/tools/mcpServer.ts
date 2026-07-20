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

// MCP Streamable HTTP server — Bun + @modelcontextprotocol/server (v2, beta)
// Complete Replacement with Comprehensive Debugging
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

// ============================================================================
// DEBUG LOGGING CONFIGURATION & HELPERS
// ============================================================================
const DEBUG = true; // Set to false to disable verbose debug logging

function logDebug(section: string, message: string, data?: unknown) {
    if (!DEBUG) return;
    const timestamp = new Date().toISOString();
    const prefix = `[DEBUG ${timestamp}] [${section}]`;
    if (data !== undefined) {
        console.log(`${prefix} ${message}\n`, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
    } else {
        console.log(`${prefix} ${message}`);
    }
}

function logError(section: string, message: string, error?: unknown) {
    const timestamp = new Date().toISOString();
    const prefix = `[ERROR ${timestamp}] [${section}]`;
    if (error instanceof Error) {
        console.error(`${prefix} ${message}\nStack: ${error.stack}`);
    } else if (error !== undefined) {
        console.error(`${prefix} ${message}`, error);
    } else {
        console.error(`${prefix} ${message}`);
    }
}

// Global Process Diagnostics & Failure Tracing
process.on('uncaughtException', (err) => {
    logError('PROCESS', 'Uncaught Exception detected!', err);
});

process.on('unhandledRejection', (reason, promise) => {
    logError('PROCESS', `Unhandled Rejection at: ${promise}`, reason);
});

// Startup Environment Diagnostics
logDebug('STARTUP', 'Initializing MCP Server Environment', {
    bunVersion: Bun.version,
    nodeVersion: process.version,
    cwd: process.cwd(),
    execPath: process.execPath,
    pid: process.pid,
    envPort: process.env.PORT ?? '5555 (default)'
});

// ============================================================================
// REGISTRY & TOOL LOADING
// ============================================================================
interface RegistryEntry {
    name: string;
    description: string;
    entry: string;
    parameters: Record<string, unknown>; // raw JSON Schema from manifest.json
    importPath: string; // relative to packages/tools
}

const registry = registryData as RegistryEntry[];
const TOOLS_ROOT = path.join(process.cwd(), 'packages/tools');

logDebug('REGISTRY', 'Loaded raw registry.json', {
    toolsRootResolvedPath: TOOLS_ROOT,
    totalEntriesCount: registry.length,
    rawEntryNames: registry.map((r) => r.name)
});

type ToolFn = (args: unknown) => Promise<unknown> | unknown;

interface LoadedTool extends RegistryEntry {
    fn: ToolFn;
}

async function loadTool(entry: RegistryEntry): Promise<LoadedTool> {
    const fullImportPath = path.join(TOOLS_ROOT, entry.importPath);
    logDebug('TOOL_LOAD', `Attempting import for tool "${entry.name}"`, {
        importPathRelative: entry.importPath,
        resolvedFullPath: fullImportPath
    });

    try {
        const mod = await import(fullImportPath);
        const exportKeys = Object.keys(mod);
        logDebug('TOOL_LOAD', `Export discovery for "${entry.name}"`, { availableExports: exportKeys });

        const fn: ToolFn | undefined = typeof mod.run === 'function' ? mod.run : undefined;

        if (!fn) {
            throw new Error(
                `Tool "${entry.name}" (${entry.importPath}) does not export a "run" function. ` +
                `Found exports: [${exportKeys.join(', ')}]. Confirmed convention is: export async function run(params).`
            );
        }

        logDebug('TOOL_LOAD', `Successfully loaded function for tool "${entry.name}"`);
        return { ...entry, fn };
    } catch (err) {
        logError('TOOL_LOAD', `Failed to load tool "${entry.name}" from path "${fullImportPath}"`, err);
        throw err;
    }
}

let loadedToolsPromise: Promise<LoadedTool[]> | undefined;

function getLoadedTools(): Promise<LoadedTool[]> {
    if (!loadedToolsPromise) {
        loadedToolsPromise = (async () => {
            logDebug('REGISTRY', 'Starting tool batch load and duplicate check...');
            
            // Duplicate check
            const seenNames = new Set<string>();
            const duplicates: string[] = [];
            for (const entry of registry) {
                if (seenNames.has(entry.name)) {
                    duplicates.push(entry.name);
                }
                seenNames.add(entry.name);
            }

            if (duplicates.length > 0) {
                const errStr = `Duplicate tool names detected in registry: [${duplicates.join(', ')}]`;
                logError('REGISTRY', errStr);
                throw new Error(errStr);
            }

            const results = await Promise.all(registry.map(loadTool));
            logDebug('REGISTRY', `All ${results.length} tools successfully loaded and validated.`, {
                registeredNames: results.map((t) => t.name)
            });
            return results;
        })();
    }
    return loadedToolsPromise;
}

// ============================================================================
// SERVER FACTORY & TOOL EXECUTION
// ============================================================================
async function buildServer(): Promise<McpServer> {
    logDebug('SERVER_BUILD', 'buildServer() invoked (constructing new McpServer instance)');
    const server = new McpServer({ name: 'coda2-tools-server', version: '1.0.0' });
    
    const tools = await getLoadedTools();

    for (const tool of tools) {
        logDebug('SERVER_BUILD', `Registering tool "${tool.name}" with McpServer instance`);
        
        server.registerTool(
            tool.name,
            {
                title: tool.name,
                description: tool.description,
                inputSchema: fromJsonSchema(tool.parameters)
            },
            async (args: unknown) => {
                const startTime = performance.now();
                logDebug('TOOL_EXEC', `Executing tool "${tool.name}"`, { inputArgs: args });

                try {
                    const result = await tool.fn(args);
                    const durationMs = (performance.now() - startTime).toFixed(2);
                    
                    logDebug('TOOL_EXEC', `Tool "${tool.name}" executed successfully in ${durationMs}ms`, {
                        resultOutput: result
                    });

                    return {
                        content: [{ type: 'text' as const, text: JSON.stringify(result) }]
                    };
                } catch (error) {
                    const durationMs = (performance.now() - startTime).toFixed(2);
                    logError('TOOL_EXEC', `Tool "${tool.name}" failed after ${durationMs}ms`, error);

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

    logDebug('SERVER_BUILD', 'McpServer instance successfully built and populated with tools.');
    return server;
}

const handler = createMcpHandler(buildServer, {
    onerror: (err: unknown) => {
        logError('HANDLER_ERROR', 'MCP streamable handler encounter error', err);
    }
});

// ============================================================================
// HTTP SERVER & REQUEST / RESPONSE TRACING
// ============================================================================
const MCP_PATH = '/mcp';
const PORT = Number(process.env.PORT ?? 5555);

const server = Bun.serve({
    port: PORT,
    async fetch(req) {
        const reqId = Math.random().toString(36).substring(2, 9);
        const startTime = performance.now();
        const url = new URL(req.url);

        const sessionId = req.headers.get('mcp-session-id') || req.headers.get('x-session-id') || 'none';

        logDebug('HTTP_REQ', `[${reqId}] Incoming ${req.method} ${url.pathname}`, {
            method: req.method,
            pathname: url.pathname,
            searchParams: Object.fromEntries(url.searchParams.entries()),
            headers: {
                host: req.headers.get('host'),
                origin: req.headers.get('origin'),
                contentType: req.headers.get('content-type'),
                accept: req.headers.get('accept'),
                sessionId: sessionId
            }
        });

        if (url.pathname !== MCP_PATH) {
            logDebug('HTTP_REQ', `[${reqId}] Path ${url.pathname} !== ${MCP_PATH}, returning 404`);
            return new Response('Not found', { status: 404 });
        }

        // Validate headers
        const hostValidation = hostHeaderValidationResponse(req, localhostAllowedHostnames());
        if (hostValidation) {
            logError('SECURITY', `[${reqId}] Host header validation rejected request`, req.headers.get('host'));
            return hostValidation;
        }

        const originValidation = originValidationResponse(req, localhostAllowedOrigins());
        if (originValidation) {
            logError('SECURITY', `[${reqId}] Origin header validation rejected request`, req.headers.get('origin'));
            return originValidation;
        }

        // Trace request payload if present
        let clonedReq = req;
        if (req.method === 'POST' && DEBUG) {
            try {
                const reqClone = req.clone();
                const bodyText = await reqClone.text();
                try {
                    const parsedJson = JSON.parse(bodyText);
                    logDebug('JSONRPC_REQ', `[${reqId}] Parsed JSON-RPC Request Payload:`, parsedJson);
                } catch {
                    logDebug('HTTP_REQ', `[${reqId}] Raw Post Body (non-JSON):`, bodyText);
                }
            } catch (err) {
                logError('HTTP_REQ', `[${reqId}] Failed to clone/read request body`, err);
            }
        }

        try {
            const response = await handler.fetch(clonedReq);
            const durationMs = (performance.now() - startTime).toFixed(2);

            logDebug('HTTP_RES', `[${reqId}] Response dispatched in ${durationMs}ms`, {
                status: response.status,
                statusText: response.statusText,
                contentType: response.headers.get('content-type'),
                sessionId: response.headers.get('mcp-session-id') || response.headers.get('x-session-id') || sessionId
            });

            return response;
        } catch (fetchErr) {
            const durationMs = (performance.now() - startTime).toFixed(2);
            logError('HTTP_REQ', `[${reqId}] handler.fetch threw an exception after ${durationMs}ms`, fetchErr);
            return new Response('Internal Server Error', { status: 500 });
        }
    }
});

// Fail fast at boot if any tool module is missing or malformed.
logDebug('BOOT', 'Pre-loading tools to ensure fast failure on startup errors...');
await getLoadedTools();

console.log(
    `\n🚀 MCP Streamable HTTP server listening on http://localhost:${server.port}${MCP_PATH}` +
    `\n   Debug Logging Enabled: ${DEBUG}\n`
);

process.on('SIGINT', async () => {
    logDebug('SHUTDOWN', 'SIGINT signal received. Closing handler and shutting down...');
    try {
        await handler.close();
        logDebug('SHUTDOWN', 'Handler closed cleanly.');
    } catch (err) {
        logError('SHUTDOWN', 'Error while closing handler during shutdown', err);
    }
    process.exit(0);
});