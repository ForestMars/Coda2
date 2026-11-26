/**
 * @file packages/agents/agent-tool-registry.ts
 * @description Central, auditable agent-to-tools access policy.
 */

export type AgentType = 'support' | 'coding';

interface AgentToolPolicy {
  description: string;
  tools: string[];
}

/**
 * Tool names must match the canonical names in packages/tools/registry.json.
 * Developer diagnostics are deliberately excluded from agent policies.
 */
export const AGENT_TOOL_POLICIES: Record<AgentType, AgentToolPolicy> = {
  support: {
    description: 'Support agent: handles customer inquiries and issue tracking',
    tools: [
      'github.create_issue',
      'github.search_issues',
      'github.comment_issue',
      'github.closes_issue',
    ],
  },

  coding: {
    description: 'Coding agent: handles file operations, shell commands, and code tasks',
    tools: [
      'fs.read',
      'fs.write',
      'fs.bash',
      'fs.glob',
      'github.create_issue',
      'github.search_issues',
      'github.comment_issue',
      'github.closes_issue',
    ],
  },
};

export function getAllowedToolsForAgent(agentType: AgentType): string[] {
  const policy = AGENT_TOOL_POLICIES[agentType];
  if (!policy) throw new Error(`Unknown agent type: ${agentType}`);
  return policy.tools;
}

export function filterToolsForAgent<T extends { name: string }>(
  tools: T[],
  agentType: AgentType,
): T[] {
  const allowedNames = new Set(getAllowedToolsForAgent(agentType));
  return tools.filter((tool) => allowedNames.has(tool.name));
}
