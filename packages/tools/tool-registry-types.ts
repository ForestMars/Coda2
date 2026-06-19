/**
 * @file packages/tools/tool-registry-types.ts
 * @description Type definitions for the tool registry and mode-specific filtering.
 */

export type AgentMode = 'support' | 'coding';

export interface ToolEntry {
  name: string;
  description: string;
  entry?: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  importPath?: string;
  modes?: AgentMode[]; // Which agent modes can use this tool. Defaults to both if omitted.
}

/**
 * Filter registry entries by agent mode.
 * Tools without a 'modes' field are available to all modes (backward compatible).
 */
export function filterToolsByMode(tools: ToolEntry[], mode: AgentMode): ToolEntry[] {
  return tools.filter((tool) => {
    // If modes not specified, tool is available to all modes
    if (!tool.modes || tool.modes.length === 0) {
      return true;
    }
    return tool.modes.includes(mode);
  });
}
