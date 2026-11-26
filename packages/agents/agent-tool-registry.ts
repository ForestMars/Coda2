/**
 * @file packages/agents/agent-tool-registry.ts
 * @description Central, auditable agent-to-tools access policy.
 * 
 * This is the single source of truth for which tools each agent can access.
 * It is NOT embedded in tool manifests (tools are agent-agnostic).
 * Instead, agents reference this registry when building their tool maps.
 * 
 * For event-sourcing: this config is versioned and can be snapshotted
 * to recreate deterministic agent behavior at any point in time.
 */

export type AgentType = 'support' | 'coding';

interface AgentToolPolicy {
  description: string;
  tools: string[]; // tool names that this agent can access
}

/**
 * Central declaration of which tools each agent can access.
 * Add new agents and update tool access here.
 */
export const AGENT_TOOL_POLICIES: Record<AgentType, AgentToolPolicy> = {
  support: {
    description: 'Support agent: handles customer inquiries, order lookups, issue tracking',
    tools: [
      // Smoke test
      'smoke',
      
      // GitHub operations
      'github/get_repo_info',
      'github/create_issue',
      'github/search_issues',
      'github/comment_issue',
      'github/close_issue',
    ],
  },

  coding: {
    description: 'Coding agent: handles file operations, shell commands, and code tasks',
    tools: [
      // Filesystem operations
      'fs/read',
      'fs/write',
      'fs/bash',
      'fs/glob',
      
      // GitHub operations (available to both)
      'github/get_repo_info',
      'github/create_issue',
      'github/search_issues',
      'github/comment_issue',
      'github/close_issue',
    ],
  },
};

/**
 * Get the list of tool names allowed for a given agent.
 * @param agentType The agent type (e.g., 'support', 'coding')
 * @returns Array of tool names this agent can access
 */
export function getAllowedToolsForAgent(agentType: AgentType): string[] {
  const policy = AGENT_TOOL_POLICIES[agentType];
  if (!policy) {
    throw new Error(`Unknown agent type: ${agentType}`);
  }
  return policy.tools;
}

/**
 * Filter a tool registry by agent type.
 * @param tools Full list of available tools from registry
 * @param agentType The agent type to filter for
 * @returns Only the tools this agent is allowed to use
 */
export function filterToolsForAgent<T extends { name: string }>(
  tools: T[],
  agentType: AgentType
): T[] {
  const allowedNames = getAllowedToolsForAgent(agentType);
  return tools.filter((tool) => allowedNames.includes(tool.name));
}
