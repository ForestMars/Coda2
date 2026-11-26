/**
 * @file /packages/agents/support-agent.ts
 * @description Event-Sourced Graph-Based Support Agent.
 */

// @ts-nocheck

import { generateText, jsonSchema } from 'ai';
import { ollama } from 'ai-sdk-ollama';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

//import type { AgentStep, AgentConfig, AgentSession, AgentEvent } from '@types/agent-types';
import type { AgentConfig, AgentSession, AgentEvent, AgentStep } from '@sup/types/types';
import type { ExpertiseResolverPort, ToolAdapterPort } from '@sup/domain/expertise-types';
import { rebuildGraph } from '@sup/lib/graph-reducer';
import { AgentRuntime, AgentRuntimeStatus } from '@sup/lib';
import { logger } from '@sup/infra/logger';
import { CONTEXT_ANCHOR } from '@sup/agents/config';
import { tools as registry, runTool } from "@sup/tools";
import { filterToolsForAgent } from "./agent-tool-registry";
// import { OutputPort } from '@sup/domain';

// const DEFAULT_MODEL = 'qwen2.5:7b'; // AGENT_MODEL
const DEFAULT_MODEL = 'qwen3:8b';
// const DEFAULT_MODEL = 'deepseek-r1' // Does not support tools
// const FACTOTUM_MODEL = 'qwen2.5:1.5b'; // Helper model for tool calls and retrieval-augmented steps.
const TEMPERATURE = 0;
// const LanguageModel = DEFAULT_MODEL;

const __dirname = dirname(fileURLToPath(import.meta.url));
const instructions = readFileSync(join(__dirname, '..', '..', 'config', 'agent-instructions.txt'), 'utf-8');

const supportAgentConfig: AgentConfig = {
  name: 'SupportBot',
  model: process.env.SUPPORT_AGENT_MODEL || DEFAULT_MODEL,
  instructions,
  temperature: TEMPERATURE,
  tools: []
};

/**
 * Convert the canonical MCP JSON Schemas into AI SDK 6 tool definitions.
 * The manifest remains the source of truth; this is only the provider adapter.
 */
export function buildSupportToolSet(
  availableTools = filterToolsForAgent(registry, 'support'),
  executeTool = runTool,
) {
  return Object.fromEntries(
    availableTools.map((tool) => {
      if (!tool.inputSchema) {
        throw new Error(`Tool "${tool.name}" is missing its inputSchema.`);
      }

      return [
        tool.name,
        {
          description: tool.description,
          inputSchema: jsonSchema(tool.inputSchema),
          execute: async (input) => executeTool(tool.name, input),
        },
      ];
    }),
  );
}

/**
 * (PROJECTION) Reconstruct a human-readable conversation history from the event log.
 * This is what gives the LLM a coherent "memory" of the conversation —
 * structured graph state alone is not enough for the model to resolve
 * pronoun/entity references across turns.
 */
function buildConversationHistory(events: AgentEvent[]): string {
  return events
    .filter(e => e.type === 'USER_UPDATE' || e.type === 'TOOL_RESULT')
    .map(e => {
      if (e.type === 'USER_UPDATE') {
        return `User: ${e.payload.text}`;
      }
      if (e.type === 'TOOL_RESULT') {
        // Fix: Access e.payload.result directly.
        return `System: [Tool: ${e.payload.toolId}] Output → ${JSON.stringify(e.payload.result)}`;
      }
      return null;
    })
    .filter(Boolean)
    .join('\n');
}


/**
 * Generator-based support agent using Global Workspace Theory.
 */
export async function* supportAgent(
  userInput: string,
  session: AgentSession,
  opts?: {
    // output: OutputPort;
    client?: any // LanguageModel; AI SDK type, can be a mock for testing.
    resolver?: ExpertiseResolverPort;
    tools?: Record<string, ToolAdapterPort>
    }
): AsyncGenerator<AgentStep, void, unknown> {

  if (!session) throw new Error('No session provided to Agent.');
  if (!session.events) session.events = [];

  const model = opts?.client || ollama(supportAgentConfig.model);

  /** BROADCAST: Initialize and record the User Update to the Data Plane.
   * NOTE: We push to the event log BEFORE calling rebuildGraph so that
   * the current user message is visible to the router and world model.
   */
  const userEvent: AgentEvent = {
    type: 'USER_UPDATE',
    payload: { text: userInput },
    timestamp: Date.now()
  };
  session.events.push(userEvent);

  /** REDUCR: Build the World Model from the append-only log.
   * This allows the agent to "remember" failures across devices.
   */
  const worldModel = rebuildGraph(session.events);
  const graphContext = worldModel.serialize();

  // Use the central brain we built to decide how to act.
  const protocol = opts?.resolver?.resolve(graphContext) ?? { key: 'default', name: 'General Support', skillPath: '', tools: [], systemPrompt: '' };

  logger.info(`[ROUTER] Engaging ${protocol.name} protocol.`);

  yield {
    type: 'thinking',
    timestamp: Date.now(),
    message: 'Consulting internal knowledge graph...'
  };

  /** NFERENCE: Call LLM with instructions and the serialized Graph State.
   * Prompt ordering matters for small models — place behavioral instructions
   * before the data they govern, and gate the graph with an explicit instruction
   * so the model treats it as authoritative memory, not just metadata.
   * If you're metaphorically inclined, it maps to past present future.
   */
    const systemPrompt = [
    instructions,           // Constitution — who you are, non-negotiables
    protocol.systemPrompt,  // What to do RIGHT NOW — close to the data it governs
    CONTEXT_ANCHOR,         // How to interpret what follows
    '### CURRENT KNOWLEDGE_GRAPH\n' +
    'The following represents your memory of this conversation. ' +
    'All entity IDs and states here are established facts — ' +
    'do NOT ask the user to re-provide information already present here.\n',
    graphContext,           // The World Model — last thing read, most salient
  ].filter(Boolean).join('\n\n');

  // Include reconstructed conversation history in the prompt so the model
  // can resolve cross-turn references (e.g. "it" → order #999).
  // Without this, the model has no conversational grounding — structured
  // graph state alone is not sufficient for pronoun/entity resolution.
  const conversationHistory = buildConversationHistory(session.events);
  const fullPrompt = conversationHistory
    ? `${conversationHistory}\nUser: ${userInput}`
    : userInput;

 /**
 * Executes generative request and logs precise inference metrics.
 * * @async
 * @name executeInference
 * @param {string} systemPrompt - The system-level instructions.
 * @param {string} fullPrompt - The user-provided prompt.
 * @returns {Promise<Object>} The response from the generative model.
 * * @note Token counts are calculated using a characters-to-tokens heuristic (1 token ≈ 4 chars).
 * @see {@link logger} for 'inference_complete' event structure.
 */
  const startTime = performance.now();

  const response = await generateText({
    model,
    system: systemPrompt,
    temperature: supportAgentConfig.temperature,
    tools: buildSupportToolSet(),
    prompt: fullPrompt,
  });

  logger.debug({ toolCalls: JSON.stringify(response.toolCalls), toolResults: JSON.stringify(response.toolResults) }, 'raw SDK response');

  // AI SDK executes tools through their native execute handlers.
  // Do not parse tool-call-shaped assistant prose or re-run an executed side effect.
  const toolResults = (response.toolResults ?? []).map((toolResult) => ({
    toolName: toolResult.toolName,
    result: toolResult.output,
    args: toolResult.input,
  }));

  if ((response.toolCalls?.length ?? 0) > 0 && toolResults.length === 0) {
    logger.error(
      { toolCalls: response.toolCalls },
      'Model returned tool calls without corresponding executed tool results',
    );
  }

  /** EXECUTION & BROADCAST: Finalize actions and record to the Data Plane. */
  if (toolResults.length > 0) {
    for (const tr of toolResults) {
      yield { type: 'tool_call', timestamp: Date.now(), toolId: tr.toolName, parameters: tr.args };

      session.events.push({
        type: 'TOOL_RESULT',
        payload: { toolId: tr.toolName, result: tr.result, args: tr.args },
        timestamp: Date.now()
      });

      yield { type: 'tool_result', timestamp: Date.now(), toolId: tr.toolName, result: tr.result };
    }

    const updatedHistory = buildConversationHistory(session.events);
    const finalResponse = await generateText({
      model,
      system: systemPrompt,
      temperature: supportAgentConfig.temperature,
      prompt: `${updatedHistory}\n\nBased on the tool results above, summarize the current status for the user.`,
    });

    yield { type: 'final', timestamp: Date.now(), text: finalResponse.text };
  } else {
    yield { type: 'final', timestamp: Date.now(), text: response.text.trim() };
  }

  const latencyMs = Math.round(performance.now() - startTime);
  logger.info({
    latencyMs,
    model: supportAgentConfig.model,
    toolCalls: toolResults.length
  }, 'inference_complete');
}

export const supportAgentModelSpec = supportAgentConfig.model;