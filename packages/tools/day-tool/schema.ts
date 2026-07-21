// packages/tools/day/schema.ts
//
// JSON Schema (2020-12) for the day.get tool's input. This tool takes no
// arguments today, but the schema is kept explicit rather than omitted so
// fromJsonSchema() in mcpServer.ts has a real object to validate against,
// and so adding an argument later (e.g. `timezone`) is a schema change,
// not a new file.

export const inputSchema = {
    type: 'object',
    properties: {},
    additionalProperties: false
} as const;

export type DayGetInput = Record<string, never>;