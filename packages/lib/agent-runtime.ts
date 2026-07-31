import { logger } from '@sup/infra/logger';
import type { AgentStep } from '@sup/types/types';

export enum AgentRuntimeStatus {
  pending = 'pending',
  running = 'running',
  completed = 'completed',
  failed = 'failed',
}

export interface AgentRuntimeRunOptions {
  name: string;
  sessionId: string;
  input: string;
  metadata?: Record<string, unknown>;
}

export interface AgentRuntimeTraceEvent {
  kind: 'status' | 'step';
  message: string;
  timestamp: number;
  span?: 'reasoning' | 'tool' | 'final';
}

export interface AgentRuntimeSpan {
  name: 'reasoning' | 'tool' | 'final';
  message: string;
  startedAt: number;
  endedAt: number;
  attributes?: Record<string, unknown>;
}

export interface AgentRuntimeResult {
  status: AgentRuntimeStatus;
  runId: string;
  startedAt: number;
  completedAt?: number;
  output?: { text?: string; [key: string]: unknown };
  steps: AgentStep[];
  error?: string;
  trace: AgentRuntimeTraceEvent[];
  spans: AgentRuntimeSpan[];
}

export interface AgentRuntimeState {
  sessionId: string;
  input: string;
  status: AgentRuntimeStatus;
  memory: Record<string, unknown>;
  toolCalls: Array<{ toolId: string; parameters?: unknown; result?: unknown }>;
  intermediateResults: Record<string, unknown>;
  spans: AgentRuntimeSpan[];
}

export interface AgentRuntimeCallbacks {
  onStep?: (step: AgentStep) => void;
}

export interface AgentRuntimeFactory {
  (input: string, session: { id: string; events: unknown[]; [key: string]: unknown }, opts?: Record<string, unknown>): AsyncGenerator<AgentStep, void, unknown>;
}

export class AgentRuntime {
  public readonly runId: string;
  public readonly name: string;
  public readonly sessionId: string;
  public readonly input: string;
  public readonly metadata: Record<string, unknown>;
  public readonly state: AgentRuntimeState;

  constructor(options: AgentRuntimeRunOptions) {
    this.runId = `${options.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.name = options.name;
    this.sessionId = options.sessionId;
    this.input = options.input;
    this.metadata = options.metadata ?? {};
    this.state = {
      sessionId: this.sessionId,
      input: this.input,
      status: AgentRuntimeStatus.pending,
      memory: {},
      toolCalls: [],
      intermediateResults: {},
      spans: [],
    };
  }

  async run(
    agentFactory: AgentRuntimeFactory | (() => AsyncGenerator<AgentStep, void, unknown>),
    callbacks?: AgentRuntimeCallbacks,
  ): Promise<AgentRuntimeResult> {
    const startedAt = Date.now();
    const steps: AgentStep[] = [];
    const trace: AgentRuntimeTraceEvent[] = [
      { kind: 'status', message: 'runtime started', timestamp: startedAt },
    ];

    this.state.status = AgentRuntimeStatus.running;

    try {
      const generator = typeof agentFactory === 'function' && agentFactory.length > 0
        ? (agentFactory as AgentRuntimeFactory)(this.input, { id: this.sessionId, events: [], sessionId: this.sessionId }, this.metadata)
        : (agentFactory as () => AsyncGenerator<AgentStep, void, unknown>)();

      for await (const step of generator) {
        steps.push(step);
        callbacks?.onStep?.(step);

        if (step.type === 'thinking') {
          const reasoningMessage = typeof step.message === 'string' ? step.message : 'thinking';
          const span: AgentRuntimeSpan = {
            name: 'reasoning',
            message: reasoningMessage,
            startedAt: Date.now(),
            endedAt: Date.now(),
            attributes: { runId: this.runId, sessionId: this.sessionId, stepType: step.type },
          };
          this.state.spans.push(span);
          logger.info({ runId: this.runId, sessionId: this.sessionId, span: 'reasoning', stepType: step.type }, reasoningMessage);
          trace.push({ kind: 'step', message: reasoningMessage, timestamp: Date.now(), span: 'reasoning' });
        } else if (step.type === 'tool_call') {
          this.state.toolCalls.push({ toolId: step.toolId, parameters: step.parameters });
          const span: AgentRuntimeSpan = {
            name: 'tool',
            message: `tool:${step.toolId}`,
            startedAt: Date.now(),
            endedAt: Date.now(),
            attributes: { runId: this.runId, sessionId: this.sessionId, toolId: step.toolId },
          };
          this.state.spans.push(span);
          logger.info({ runId: this.runId, sessionId: this.sessionId, span: 'tool', toolId: step.toolId }, 'tool call');
          trace.push({ kind: 'step', message: `tool:${step.toolId}`, timestamp: Date.now(), span: 'tool' });
        } else if (step.type === 'tool_result') {
          const lastToolCall = this.state.toolCalls.at(-1);
          if (lastToolCall) {
            lastToolCall.result = step.result;
          }
          this.state.intermediateResults[step.toolId] = step.result;
          const span: AgentRuntimeSpan = {
            name: 'tool',
            message: `tool-result:${step.toolId}`,
            startedAt: Date.now(),
            endedAt: Date.now(),
            attributes: { runId: this.runId, sessionId: this.sessionId, toolId: step.toolId },
          };
          this.state.spans.push(span);
          logger.info({ runId: this.runId, sessionId: this.sessionId, span: 'tool', toolId: step.toolId }, 'tool result');
          trace.push({ kind: 'step', message: `tool-result:${step.toolId}`, timestamp: Date.now(), span: 'tool' });
        } else if (step.type === 'final') {
          this.state.intermediateResults.final = step.text;
          const span: AgentRuntimeSpan = {
            name: 'final',
            message: step.text,
            startedAt: Date.now(),
            endedAt: Date.now(),
            attributes: { runId: this.runId, sessionId: this.sessionId },
          };
          this.state.spans.push(span);
          logger.info({ runId: this.runId, sessionId: this.sessionId, span: 'final' }, 'final output');
          trace.push({ kind: 'step', message: step.text, timestamp: Date.now(), span: 'final' });
        }
      }

      const finalStep = steps.findLast((step) => step.type === 'final') as AgentStep | undefined;
      this.state.status = AgentRuntimeStatus.completed;
      trace.push({ kind: 'status', message: 'runtime completed', timestamp: Date.now() });
      return {
        status: AgentRuntimeStatus.completed,
        runId: this.runId,
        startedAt,
        completedAt: Date.now(),
        output: finalStep ? { text: (finalStep as any).text } : {},
        steps,
        trace,
        spans: this.state.spans,
      };
    } catch (error) {
      this.state.status = AgentRuntimeStatus.failed;
      trace.push({ kind: 'status', message: 'runtime failed', timestamp: Date.now() });
      return {
        status: AgentRuntimeStatus.failed,
        runId: this.runId,
        startedAt,
        completedAt: Date.now(),
        steps,
        error: error instanceof Error ? error.message : String(error),
        trace,
        spans: this.state.spans,
      };
    }
  }
}
