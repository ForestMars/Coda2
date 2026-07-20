// packages/tools/day/index.ts
//
// Drop-in MCP v2 tool. Replaces the standalone day-server.mjs, which ran
// its own ws://localhost:9001 JSON-RPC server. Under v2, tools are plain
// functions loaded into the shared mcpServer.ts process — there is no
// per-tool transport, socket, or server instance anymore.
//
// This file is the module's barrel: it's the single import surface for
// the tool (run, inputSchema, and the input type all re-export from here).

import type { DayGetInput } from './schema';

export { inputSchema } from './schema';
export type { DayGetInput } from './schema';

export async function run(_params: DayGetInput): Promise<{ day: string; text: string }> {
    const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return {
        day,
        text: `Today is ${day}`
    };
}