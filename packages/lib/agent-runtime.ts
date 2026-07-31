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
  model?: string;
}

export interface AgentRuntimeTraceEvent {
  kind: 'status' | 'step';
  message: string;
  timestamp: number;
  span?: 'reasoning' | 'tool' | 'final';
}

export interface AgentRuntimeSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: 'reasoning' | 'tool' | 'final';
  message: string;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  status: 'ok' | 'error';
  attributes?: Record<string, unknown>;
}

export interface AgentRuntimeMetadata {
  agentName: string;
  sessionId: string;
  runId: string;
  input: string;
  model?: string;
  latencyMs?: number;
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
  onSpan?: (span: AgentRuntimeSpan) => void;
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
  public readonly runtimeMetadata: AgentRuntimeMetadata;
  private activeToolSpans = new Map<string, { spanId: string; startedAt: number; parameters?: unknown }>();

  constructor(options: AgentRuntimeRunOptions) {
    this.runId = `${options.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.name = options.name;
    this.sessionId = options.sessionId;
    this.input = options.input;
    this.metadata = options.metadata ?? {};
    this.runtimeMetadata = {
      agentName: options.name,
      sessionId: options.sessionId,
      runId: this.runId,
      input: options.input,
      model: options.model,
    };
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
          const startedAt = Date.now();
          const reasoningMessage = typeof step.message === 'string' ? step.message : 'thinking';
          const spanId = `span-${Math.random().toString(36).slice(2, 8)}`;
          const span: AgentRuntimeSpan = {
            traceId: this.runId,
            spanId,
            name: 'reasoning',
            message: reasoningMessage,
            startedAt,
            endedAt: startedAt,
            durationMs: 0,
            status: 'ok',
            attributes: { runId: this.runId, sessionId: this.sessionId, stepType: step.type },
          };
          this.state.spans.push(span);
          callbacks?.onSpan?.(span);
          logger.info({
            eventType: 'span_end',
            traceId: this.runId,
            spanId,
            name: 'reasoning',
            message: reasoningMessage,
            startedAt,
            endedAt: startedAt,
            durationMs: 0,
            status: 'ok',
            runId: this.runId,
            sessionId: this.sessionId,
            span: 'reasoning',
            stepType: step.type,
            agentName: this.name,
            model: this.runtimeMetadata.model,
          }, reasoningMessage);
          trace.push({ kind: 'step', message: reasoningMessage, timestamp: Date.now(), span: 'reasoning' });
        } else if (step.type === 'tool_call') {
          this.state.toolCalls.push({ toolId: step.toolId, parameters: step.parameters });
          const spanId = `tool-${step.toolId}-${Math.random().toString(36).slice(2, 8)}`;
          this.activeToolSpans.set(step.toolId, {
            spanId,
            startedAt: Date.now(),
            parameters: step.parameters,
          });
          logger.info({
            eventType: 'span_start',
            traceId: this.runId,
            spanId,
            name: 'tool',
            toolId: step.toolId,
            runId: this.runId,
            sessionId: this.sessionId,
            span: 'tool',
            agentName: this.name,
            model: this.runtimeMetadata.model,
          }, `tool_call:start:${step.toolId}`);
          trace.push({ kind: 'step', message: `tool:${step.toolId}`, timestamp: Date.now(), span: 'tool' });
        } else if (step.type === 'tool_result') {
          const lastToolCall = this.state.toolCalls.at(-1);
          if (lastToolCall) {
            lastToolCall.result = step.result;
          }
          this.state.intermediateResults[step.toolId] = step.result;
          const pending = this.activeToolSpans.get(step.toolId);
          const endedAt = Date.now();
          const startedAt = pending?.startedAt ?? endedAt;
          const durationMs = endedAt - startedAt;
          const spanId = pending?.spanId ?? `tool-${step.toolId}`;
          const span: AgentRuntimeSpan = {
            traceId: this.runId,
            spanId,
            name: 'tool',
            message: `tool:${step.toolId}`,
            startedAt,
            endedAt,
            durationMs,
            status: 'ok',
            attributes: {
              runId: this.runId,
              sessionId: this.sessionId,
              toolId: step.toolId,
              parameters: pending?.parameters,
              result: step.result,
            },
          };
          this.state.spans.push(span);
          callbacks?.onSpan?.(span);
          this.activeToolSpans.delete(step.toolId);
          logger.info({
            eventType: 'span_end',
            traceId: this.runId,
            spanId,
            name: 'tool',
            message: `tool:${step.toolId}`,
            startedAt,
            endedAt,
            durationMs,
            status: 'ok',
            runId: this.runId,
            sessionId: this.sessionId,
            span: 'tool',
            toolId: step.toolId,
            agentName: this.name,
            model: this.runtimeMetadata.model,
          }, `tool_call:end:${step.toolId}`);
          trace.push({ kind: 'step', message: `tool-result:${step.toolId}`, timestamp: Date.now(), span: 'tool' });
        } else if (step.type === 'final') {
          this.state.intermediateResults.final = step.text;
          const startedAt = Date.now();
          const spanId = `span-${Math.random().toString(36).slice(2, 8)}`;
          const span: AgentRuntimeSpan = {
            traceId: this.runId,
            spanId,
            name: 'final',
            message: step.text,
            startedAt,
            endedAt: startedAt,
            durationMs: 0,
            status: 'ok',
            attributes: { runId: this.runId, sessionId: this.sessionId },
          };
          this.state.spans.push(span);
          callbacks?.onSpan?.(span);
          logger.info({
            eventType: 'span_end',
            traceId: this.runId,
            spanId,
            name: 'final',
            message: step.text,
            startedAt,
            endedAt: startedAt,
            durationMs: 0,
            status: 'ok',
            runId: this.runId,
            sessionId: this.sessionId,
            span: 'final',
            agentName: this.name,
            model: this.runtimeMetadata.model,
          }, 'final output');
          trace.push({ kind: 'step', message: step.text, timestamp: Date.now(), span: 'final' });
        }
      }

      const finalStep = steps.findLast((step) => step.type === 'final') as AgentStep | undefined;
      this.state.status = AgentRuntimeStatus.completed;
      this.runtimeMetadata.latencyMs = Date.now() - startedAt;
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
      this.runtimeMetadata.latencyMs = Date.now() - startedAt;
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
