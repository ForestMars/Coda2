/**
 * @file packages/agents/coding-agent.ts
 * @description Coding agent. Routes conversational questions directly,
 * hands off to the coder model for file/shell tasks.
 */

// @ts-nocheck

import { streamText, generateText } from 'ai';
import { ollama } from 'ai-sdk-ollama';
import { join } from 'node:path';
import { readFileSync } from 'fs';

import type { AgentSession, AgentEvent, AgentStep } from '@sup/types/types';
import { logger } from '@sup/infra/logger';
import { tools as registry, runTool } from '@sup/tools';

const ROUTER_MODEL = 'qwen3:8b';
const CODER_MODEL = process.env.CODING_AGENT_MODEL || 'qwen2.5-coder:14b';
const TEMPERATURE = 0;
const CWD = process.cwd();
const MAX_TOOL_STEPS = 8;

const instructions = readFileSync(
  join(import.meta.dir, '../../config/coding-agent-instructions.txt'),
  'utf-8'
).replace('{CWD}', CWD);

const FS_TOOLS = ['fs/write', 'fs/read', 'fs/bash', 'fs/glob'];
const fsRegistry = registry.filter((t) => FS_TOOLS.includes(t.name));

function toToolKey(name: string): string {
  return name.replace('/', '_');
}
function fromToolKey(key: string): string {
  return key.replace('_', '/');
}

function buildConversationHistory(events: AgentEvent[]): string {
  return events
    .filter((e) => e.type === 'USER_UPDATE' || e.type === 'TOOL_RESULT')
    .map((e) => {
      if (e.type === 'USER_UPDATE') return `User: ${e.payload.text}`;
      if (e.type === 'TOOL_RESULT') {
        return `System: [Tool: ${e.payload.toolId}] → ${JSON.stringify(e.payload.result)}`;
      }
      return null;
    })
    .filter(Boolean)
    .join('\n');
}

async function needsTools(userInput: string, history: string): Promise<boolean> {
  const response = await generateText({
    model: ollama(ROUTER_MODEL),
    temperature: 0,
    system: `You are a router. Decide if the user's request requires reading or writing files, running shell commands, or executing code.
Reply with only "yes" or "no".`,
    prompt: history ? `${history}\nUser: ${userInput}` : userInput,
  });

  logger.debug({ raw: response.text }, '[ROUTER] raw response');

  const raw = response.text ?? '';
  const endIdx = raw.indexOf('</think>');
  const answer = endIdx === -1 ? raw : raw.slice(endIdx + 8);

  logger.debug({ answer: answer.trim() }, '[ROUTER] parsed answer');

  return answer.trim().toLowerCase().startsWith('yes');
}

// Drains a fullStream. Logs every single event type so we can see what the
// model is actually sending back. Returns { text, reasoning } when done.
async function* drainStream(
  label: string,
  stream: ReturnType<typeof streamText>,
  onToolCall: (part: any) => void,
  onToolResult: (part: any) => void
): AsyncGenerator<AgentStep, { text: string; reasoning: string }, unknown> {
  let text = '';
  let reasoning = '';
  let eventCount = 0;
  let seenEndThink = false;
  let thinkBuffer = '';

  for await (const part of stream.fullStream) {
    eventCount++;
    // Log every event so we can see exactly what the model is emitting
    logger.debug({ label, eventCount, type: part.type, part }, '[STREAM] event');

    const delta = part.textDelta ?? part.text;
    if (part.type === 'text-delta' && delta) {
      text += delta;
      if (!seenEndThink) {
        thinkBuffer += delta;
        const endIdx = thinkBuffer.indexOf('</think>');
        if (endIdx !== -1) {
          seenEndThink = true;
          const after = thinkBuffer.slice(endIdx + 8).trimStart();
          if (after) yield { type: 'text_delta', delta: after, timestamp: Date.now() };
        } else if (!thinkBuffer.trimStart().startsWith('<think>')) {
          // No <think> block at all — emit immediately
          seenEndThink = true;
          yield { type: 'text_delta', delta: thinkBuffer, timestamp: Date.now() };
          thinkBuffer = '';
        }
        // still inside <think>, suppress this delta
      } else {
        yield { type: 'text_delta', delta, timestamp: Date.now() };
      }
    } else if (part.type === 'reasoning' && part.reasoning) {
      reasoning += part.reasoning;
    } else if (part.type === 'tool-call') {
      onToolCall(part);
    } else if (part.type === 'tool-result') {
      onToolResult(part);
    } else if (part.type === 'error') {
      logger.error({ label, error: part.error }, '[STREAM] error event');
    }
  }

  logger.debug(
    { label, eventCount, textLen: text.length, reasoningLen: reasoning.length },
    '[STREAM] done'
  );

  return { text, reasoning };
}

function stripThinking(text: string): string {
  const endIdx = text.indexOf('</think>');
  if (endIdx === -1) return text.trim();
  const after = text.slice(endIdx + 8).trim();
  if (after) return after;
  const startIdx = text.indexOf('<think>');
  return startIdx !== -1 ? text.slice(startIdx + 7, endIdx).trim() : text.trim();
}

function bestText(text: string, reasoning: string): string {
  const raw = text.trim() || reasoning.trim();
  const result = stripThinking(raw);
  logger.debug({ textLen: text.length, reasoningLen: reasoning.length, resultLen: result.length }, '[bestText]');
  return result;
}

export async function* codingAgent(
  userInput: string,
  session: AgentSession,
  opts?: { client?: any }
): AsyncGenerator<AgentStep, void, unknown> {
  if (!session) throw new Error('No session provided to codingAgent.');
  if (!session.events) session.events = [];

  logger.debug({ userInput }, '[codingAgent] start');

  session.events.push({
    type: 'USER_UPDATE',
    payload: { text: userInput },
    timestamp: Date.now(),
  });

  yield { type: 'thinking', timestamp: Date.now(), message: 'Reading task...' };

  const conversationHistory = buildConversationHistory(session.events);
  const fullPrompt = conversationHistory
    ? `${conversationHistory}\nUser: ${userInput}`
    : userInput;

  const requiresTools = await needsTools(userInput, conversationHistory);
  logger.debug({ requiresTools }, '[codingAgent] routing decision');

  // ── Conversational path ───────────────────────────────────────────────────
  if (!requiresTools) {
    const model = opts?.client || ollama(ROUTER_MODEL);
    logger.debug({ model: ROUTER_MODEL }, '[codingAgent] conversational path');

    const stream = streamText({
      model,
      system: instructions,
      temperature: TEMPERATURE,
      prompt: fullPrompt,
    });

    let text = '';
    let reasoning = '';
    const gen = drainStream('conversational', stream, () => {}, () => {});
    while (true) {
      const next = await gen.next();
      if (next.done) {
        ({ text, reasoning } = next.value as { text: string; reasoning: string });
        break;
      }
      yield next.value as AgentStep;
    }

    const finalText = bestText(text, reasoning);
    logger.debug({ finalText }, '[codingAgent] yielding final');
    yield { type: 'final', timestamp: Date.now(), text: finalText };
    return;
  }

  // ── Agentic tool loop ─────────────────────────────────────────────────────
  const model = opts?.client || ollama(CODER_MODEL);
  logger.debug({ model: CODER_MODEL }, '[codingAgent] tool path');

  const toolsMap = Object.fromEntries(
    fsRegistry.map((t) => [
      toToolKey(t.name),
      {
        description: t.description,
        parameters: t.parameters,
        execute: async (args: any) => runTool(t.name, args),
      },
    ])
  );

  logger.debug({ toolKeys: Object.keys(toolsMap) }, '[codingAgent] registered tools');

  let stepCount = 0;
  let currentPrompt = fullPrompt;

  while (stepCount < MAX_TOOL_STEPS) {
    stepCount++;
    logger.debug({ stepCount }, '[codingAgent] tool loop step');

    let toolCallFired = false;
    const pendingToolCalls: AgentStep[] = [];
    const pendingToolResults: AgentStep[] = [];

    const stream = streamText({
      model,
      system: instructions,
      temperature: TEMPERATURE,
      tools: toolsMap,
      prompt: currentPrompt,
    });

    let text = '';
    let reasoning = '';

    const gen = drainStream(
      `tool-step-${stepCount}`,
      stream,
      (part) => {
        toolCallFired = true;
        const originalName = fromToolKey(part.toolName);
        logger.debug({ toolName: originalName, args: part.args }, '[codingAgent] tool-call');
        pendingToolCalls.push({
          type: 'tool_call',
          timestamp: Date.now(),
          toolId: originalName,
          parameters: part.args,
        });
      },
      (part) => {
        const originalName = fromToolKey(part.toolName);
        logger.debug({ toolName: originalName, result: part.result }, '[codingAgent] tool-result');
        session.events.push({
          type: 'TOOL_RESULT',
          payload: { toolId: originalName, result: part.result, args: part.args },
          timestamp: Date.now(),
        });
        pendingToolResults.push({
          type: 'tool_result',
          timestamp: Date.now(),
          toolId: originalName,
          result: part.result,
        });
      }
    );

    while (true) {
      const next = await gen.next();
      if (next.done) {
        ({ text, reasoning } = next.value as { text: string; reasoning: string });
        break;
      }
      yield next.value as AgentStep;
    }

    for (const step of [...pendingToolCalls, ...pendingToolResults]) {
      yield step;
    }

    // ── Regex fallback ────────────────────────────────────────────────────
    if (!toolCallFired) {
      const raw = bestText(text, reasoning);
      logger.debug({ raw }, '[codingAgent] no native tool call, trying regex fallback');

      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          const toolKey = parsed.name || parsed.tool || parsed.toolName;
          const originalName = fromToolKey(toolKey);
          const toolDef = fsRegistry.find((t) => t.name === originalName);
          const args = parsed.arguments ?? parsed.parameters ?? parsed.args;
          logger.debug({ toolKey, originalName, hasToolDef: !!toolDef, args }, '[codingAgent] regex fallback parsed');

          if (toolDef && args != null) {
            toolCallFired = true;
            yield { type: 'tool_call', timestamp: Date.now(), toolId: originalName, parameters: args };
            const toolResult = await runTool(originalName, args);
            session.events.push({
              type: 'TOOL_RESULT',
              payload: { toolId: originalName, result: toolResult, args },
              timestamp: Date.now(),
            });
            yield { type: 'tool_result', timestamp: Date.now(), toolId: originalName, result: toolResult };
          }
        } catch (e) {
          logger.debug({ err: e }, '[codingAgent] regex fallback parse error');
        }
      } else {
        logger.debug('[codingAgent] regex fallback: no JSON found in response');
      }
    }

    if (!toolCallFired) {
      const finalText = bestText(text, reasoning);
      logger.debug({ finalText }, '[codingAgent] no tool fired, yielding final');
      yield { type: 'final', timestamp: Date.now(), text: finalText };
      return;
    }

    currentPrompt = buildConversationHistory(session.events);
  }

  // Hit MAX_TOOL_STEPS
  logger.warn(`[codingAgent] Reached MAX_TOOL_STEPS (${MAX_TOOL_STEPS}), requesting summary.`);

  const summaryStream = streamText({
    model,
    system: instructions,
    temperature: TEMPERATURE,
    prompt: `${buildConversationHistory(session.events)}\n\nBriefly summarise what was done and any next steps.`,
  });

  let summaryText = '';
  let summaryReasoning = '';
  const summaryGen = drainStream('summary', summaryStream, () => {}, () => {});
  while (true) {
    const next = await summaryGen.next();
    if (next.done) {
      ({ text: summaryText, reasoning: summaryReasoning } = next.value as { text: string; reasoning: string });
      break;
    }
    yield next.value as AgentStep;
  }

  yield { type: 'final', timestamp: Date.now(), text: bestText(summaryText, summaryReasoning) };
}

export const codingAgentModelSpec = `router:${ROUTER_MODEL} coder:${CODER_MODEL}`;