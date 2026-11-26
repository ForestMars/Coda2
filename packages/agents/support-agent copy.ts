/**
 * @file /packages/agents/support-agent.ts
 * @description Event-Sourced Graph-Based Support Agent.
 */

// @ts-nocheck

import { generateText } from 'ai';
import { ollama } from 'ai-sdk-ollama';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { z } from 'zod';

import type { AgentConfig, AgentSession, AgentEvent, AgentStep } from '@sup/types/types';
import { rebuildGraph } from '@sup/lib/graph-reducer';
import type { AgentFn, AgentInvocationContext } from '@sup/domain/agent-port';
import { logger } from '@sup/infra/logger';
import { CONTEXT_ANCHOR } from '@sup/agents/config';
import { tools as registry, runTool } from "@sup/tools";
import { filterToolsForAgent } from "./agent-tool-registry";

const DEFAULT_MODEL = 'qwen2.5:7b'; // confirmed present via `ollama list` — do not change without checking
const TEMPERATURE = 0;

const __dirname = dirname(fileURLToPath(import.meta.url));
const instructions = readFileSync(join(__dirname, '..', '..', 'config', 'agent-instructions.txt'), 'utf-8');

const supportAgentConfig: AgentConfig = {
  name: 'SupportBot',
  model: process.env.SUPPORT_AGENT_MODEL || DEFAULT_MODEL,
  instructions,
  temperature: TEMPERATURE,
  tools: []
};

const toolCallSchema = z.object({
  tool: z.string(),
  entityId: z.string().or(z.number()).transform(v => String(v))
});

// --- Model availability check ---------------------------------------------
// Cached per-process so we don't hit Ollama's API on every single turn.
// Checks once, at first use, and throws immediately with a clear message
// instead of letting a bad model string reach generateText() where the
// failure previously surfaced as a silent single-step stall.
let modelCheckPromise: Promise<void> | null = null;

async function assertModelAvailable(model: string): Promise<void> {
  if (modelCheckPromise) return modelCheckPromise;

  modelCheckPromise = (async () => {
    const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    let tags: { models?: Array<{ name: string; model?: string }> };

    try {
      const res = await fetch(`${ollamaHost}/api/tags`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) {
        throw new Error(`Ollama /api/tags returned HTTP ${res.status}`);
      }
      tags = await res.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ ollamaHost, err: message }, 'Could not reach Ollama to verify model availability');
      throw new Error(
        `Cannot reach Ollama at ${ollamaHost} to verify model "${model}" is available. ` +
        `Is Ollama running? (checked: ${ollamaHost}/api/tags) — underlying error: ${message}`
      );
    }

    const available = (tags.models ?? []).map((m) => m.name ?? m.model);
    const isAvailable = available.some((name) => name === model || name?.startsWith(`${model}:`) || model.startsWith(`${name}:`));

    if (!isAvailable) {
      logger.error({ model, available }, 'Configured model is not pulled in Ollama');
      throw new Error(
        `Model "${model}" is not available in Ollama. ` +
        `SUPPORT_AGENT_MODEL is set to this value (or it's the hardcoded DEFAULT_MODEL fallback) ` +
        `but "ollama list" does not show it pulled. Available models: ${available.join(', ') || '(none)'}. ` +
        `Run: ollama pull ${model}`
      );
    }
  })();

  return modelCheckPromise;
}

function buildConversationHistory(events: AgentEvent[]): string {
  return events
    .filter(e => e.type === 'USER_UPDATE' || e.type === 'TOOL_RESULT')
    .map(e => {
      if (e.type === 'USER_UPDATE') {
        return `User: ${e.payload.text}`;
      }
      if (e.type === 'TOOL_RESULT') {
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
export const supportAgent: AgentFn = async function* (
  userInput: string,
  session: AgentSession,
  opts?: AgentInvocationContext,
): AsyncGenerator<AgentStep, void, unknown> {

  if (!session) {
    // Was: throw new Error('No session provided to Agent.')
    // A throw here happens before the generator ever yields — AgentRuntime.run()
    // catches it and returns a swallowed status:'failed' with nothing visible
    // to a caller that doesn't check the return value. Yield-and-return instead,
    // per the contract: every path must produce a visible final step.
    logger.error({}, 'supportAgent invoked with no session');
    yield {
      type: 'final',
      timestamp: Date.now(),
      text: '[agent error] No session provided to agent.',
    };
    return;
  }
  if (!session.events) session.events = [];

  // Fail loud, immediately, before doing any work, if the configured model
  // isn't actually available. This is the single point of failure that was
  // previously silent: a missing SUPPORT_AGENT_MODEL env var fell back to a
  // hardcoded DEFAULT_MODEL that wasn't pulled, generateText() threw deep
  // inside this generator, AgentRuntime.run() swallowed it into a
  // status:'failed' result that no caller checked, and the only visible
  // symptom was the generator stopping after a single 'thinking' step.
  if (!opts?.client) {
    try {
      await assertModelAvailable(supportAgentConfig.model);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ model: supportAgentConfig.model, err: message }, 'supportAgent: model availability check failed');
      yield {
        type: 'final',
        timestamp: Date.now(),
        text: `[agent error] ${message}`,
      };
      return;
    }
  }

  const model = opts?.client || ollama(supportAgentConfig.model);

  const userEvent: AgentEvent = {
    type: 'USER_UPDATE',
    payload: { text: userInput },
    timestamp: Date.now()
  };
  session.events.push(userEvent);

  const worldModel = rebuildGraph(session.events);
  const graphContext = worldModel.serialize();

  const protocol = opts?.resolver?.resolve(graphContext) ?? { key: 'default', name: 'General Support', skillPath: '', tools: [], systemPrompt: '' };

  logger.info(`[ROUTER] Engaging ${protocol.name} protocol.`);

  yield {
    type: 'thinking',
    timestamp: Date.now(),
    message: 'Consulting internal knowledge graph...'
  };

  const systemPrompt = [
    instructions,
    protocol.systemPrompt,
    CONTEXT_ANCHOR,
    '### CURRENT KNOWLEDGE_GRAPH\n' +
    'The following represents your memory of this conversation. ' +
    'All entity IDs and states here are established facts — ' +
    'do NOT ask the user to re-provide information already present here.\n',
    graphContext,
  ].filter(Boolean).join('\n\n');

  const conversationHistory = buildConversationHistory(session.events);
  const fullPrompt = conversationHistory
    ? `${conversationHistory}\nUser: ${userInput}`
    : userInput;

  const startTime = performance.now();

  let response;
  try {
    response = await generateText({
      model,
      system: systemPrompt,
      temperature: supportAgentConfig.temperature,
      tools: Object.fromEntries(
        filterToolsForAgent(registry, 'support').map((t) => [
          t.name,
          {
            description: t.description,
            parameters: t.parameters,
            execute: async (args) => await runTool(t.name, args),
          },
        ])
      ),
      prompt: fullPrompt,
    });
  } catch (err) {
    // generateText() failures (unreachable host, bad model, tool schema
    // errors, timeouts, etc.) previously propagated out of this generator,
    // got caught by AgentRuntime.run()'s try/catch, and returned as a
    // status:'failed' result that neither CLI nor TUI checked. Surface it
    // as a visible 'final' step with full telemetry instead.
    const message = err instanceof Error ? err.message : String(err);
    logger.error({
      err: message,
      stack: err instanceof Error ? err.stack : undefined,
      model: supportAgentConfig.model,
      sessionId: session.id,
      input: userInput,
    }, 'supportAgent: generateText failed');

    yield {
      type: 'final',
      timestamp: Date.now(),
      text: `[agent error] Model call failed: ${message}`,
    };
    return;
  }

  logger.debug({ toolCalls: JSON.stringify(response.toolCalls), toolResults: JSON.stringify(response.toolResults) }, 'raw SDK response');

  let toolResults: { toolName: string; result: any; args: any }[] = [];

  if (response.toolResults && response.toolResults.length > 0) {
    toolResults = await Promise.all(response.toolResults.map(async (tr) => {
      let finalResult = tr.output;

      logger.debug({ toolName: tr.toolName, input: tr.input, output: tr.output }, 'tool result debug');
      if (finalResult === undefined) {
        logger.warn({ tool: tr.toolName }, '[FIX] SDK returned undefined result. Forcing manual execution...');
        const toolCall = response.toolCalls?.find(tc => tc.toolName === tr.toolName);
        finalResult = await runTool(tr.toolName, toolCall?.args ?? tr.args);
      }

      logger.info(`[TRACE] Final Tool Output: ${tr.toolName} -> ${JSON.stringify(finalResult)}`);

      return {
        toolName: tr.toolName,
        result: finalResult,
        args: tr.args
      };
    }));
  } else {
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const toolName = parsed.tool || parsed.toolName;
        if (toolName && registry.find(t => t.name === toolName)) {
          const args = parsed.parameters || parsed.args || parsed;
          const result = await runTool(toolName, args);
          toolResults.push({ toolName, result, args });
        }
      } catch (e) {
        logger.debug('Regex fallback parsing failed.');
      }
    }
  }

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

    let finalResponse;
    try {
      finalResponse = await generateText({
        model,
        system: systemPrompt,
        temperature: supportAgentConfig.temperature,
        prompt: `${updatedHistory}\n\nBased on the tool results above, summarize the current status for the user.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ err: message, model: supportAgentConfig.model }, 'supportAgent: summary generateText failed');
      yield { type: 'final', timestamp: Date.now(), text: `[agent error] Summary call failed: ${message}` };
      return;
    }

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
};

export const supportAgentModelSpec = supportAgentConfig.model;
