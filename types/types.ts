// src/types/types.ts

/**
 * Types of steps an agent can yield during execution
 */
export type AgentStepType =
  | 'thinking' // Agent is processing/calling LLM
  | 'text_delta' // Used for streaming 
  | 'llm_response' // LLM returned text
  | 'tool_call' // Agent is calling a tool
  | 'tool_result' // Tool execution completed
  | 'final'; // Final answer ready

/**
 * Base step that all agent steps extend
 */
interface BaseAgentStep {
  type: AgentStepType;
  timestamp: number;
}

/**
 * Agent is thinking/processing
 */
export interface ThinkingStep extends BaseAgentStep {
  type: 'thinking';
  message: string;
}


/**
 * Streaming step 
 */
export interface TextDeltaStep extends BaseAgentStep {
  type: 'text_delta';
  delta: string;
}

/**
 * LLM returned a response
 */
export interface LLMResponseStep extends BaseAgentStep {
  type: 'llm_response';
  text: string;
  raw: unknown; // Raw LLM response
}

/**
 * Agent is calling a tool
 */
export interface ToolCallStep extends BaseAgentStep {
  type: 'tool_call';
  toolId: string;
  toolName: string;
  parameters: Record<string, unknown>;
}

/**
 * Tool execution result
 */
export interface ToolResultStep extends BaseAgentStep {
  type: 'tool_result';
  toolId: string;
  result: unknown;
  error?: string;
}

/**
 * Final synthesized answer
 */
export interface FinalStep extends BaseAgentStep {
  type: 'final';
  text: string;
}

/**
 * Union of all possible agent steps
 */
export type AgentStep =
  | ThinkingStep
  | TextDeltaStep 
  | LLMResponseStep
  | ToolCallStep
  | ToolResultStep
  | FinalStep;

/**
 * Tool definition interface
 */
export interface Tool<
  TParams = Record<string, unknown>,
  TResult = unknown,
> {
  id: string;
  name: string;
  description: string;
  execute: (params: TParams) => Promise<TResult>;
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  name: string;
  model: string;
  instructions: string;
  tools: Tool[];
}
/**
 * Events that can occur in an agent session
 * Used for tracking state changes over time
 */
export type AgentEvent =
  | {
      type: 'USER_UPDATE';
      payload: {text: string};
      timestamp: number;
    }
  | {
      type: 'ORACLE_DELETE';
      payload: { id: string };
      timestamp: number;
    }
  | {
      type: 'ADMIN_RESTORE';
      payload: { metadata: any };
      timestamp: number;
    }
  | {
      type: 'TOOL_RESULT';
      payload: { toolId: string; entityId: string; result: any };
      timestamp: number;
    };

/** Agent session state
 */
export interface AgentSession {
  sessionId: string;
  userId: string;
  id: string;
  events: AgentEvent[];
  // This is our "World Model" - the current state of the subnet
  worldModel: {
    unresolvedEntities: Record<string, any>;
    lookupFailures: string[]; // Track IDs that "failed" the Control Plane
  };
}
