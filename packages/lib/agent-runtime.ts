import { logger } from '@sup/infra/logger';
import type { AgentStep } from '@sup/types/types';
import type { Span, Tracer } from '@opentelemetry/api';
import type { Span, Tracer } from '@opentelemetry/api';

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
  telemetry?: {
    tracer?: Tracer;
  };
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
  name: 'root' | 'reasoning' | 'tool' | 'final';
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
  public readonly rootSpanId: string;
  public readonly name: string;
  public readonly sessionId: string;
  public readonly input: string;
  public readonly metadata: Record<string, unknown>;
  public readonly state: AgentRuntimeState;
  public readonly runtimeMetadata: AgentRuntimeMetadata;
  private readonly tracer?: Tracer;

  private activeToolSpans = new Map<string, { spanId: string; startedAt: number; parameters?: unknown }>();

  constructor(options: AgentRuntimeRunOptions) {
    this.runId = `${options.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.rootSpanId = `root-${Math.random().toString(36).slice(2, 8)}`;
    this.name = options.name;
    this.sessionId = options.sessionId;
    this.input = options.input;
    this.metadata = options.metadata ?? {};
    this.tracer = options.telemetry?.tracer;
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

    const otelRootSpan = this.tracer?.startSpan('agent.runtime', {
      attributes: {
        'agent.name': this.name,
        'agent.session_id': this.sessionId,
        'agent.run_id': this.runId,
      },
    });

    if (otelRootSpan) {
      otelRootSpan.setAttribute('agent.input', this.input);
      otelRootSpan.setAttribute('agent.model', this.runtimeMetadata.model ?? 'unknown');
    }

    // Log ROOT Span Start
    logger.info({
      eventType: 'span_start',
      traceId: this.runId,
      spanId: this.rootSpanId,
      name: 'root',
      agentName: this.name,
      sessionId: this.sessionId,
      model: this.runtimeMetadata.model,
    }, `agent_run:start:${this.name}`);

    let lastStepTime = startedAt;

    try {
      const generator = typeof agentFactory === 'function' && agentFactory.length > 0
        ? (agentFactory as AgentRuntimeFactory)(this.input, { id: this.sessionId, events: [], sessionId: this.sessionId }, this.metadata)
        : (agentFactory as () => AsyncGenerator<AgentStep, void, unknown>)();

      for await (const step of generator) {
        const stepArrivedAt = Date.now();
        steps.push(step);
        callbacks?.onStep?.(step);

        if (step.type === 'thinking') {
          const reasoningMessage = typeof step.message === 'string' ? step.message : 'thinking';
          const spanId = `reason-${Math.random().toString(36).slice(2, 8)}`;
          
          // Calculate duration since the previous step ended
          const durationMs = stepArrivedAt - lastStepTime;

          const span: AgentRuntimeSpan = {
            traceId: this.runId,
            spanId,
            parentSpanId: this.rootSpanId,
            name: 'reasoning',
            message: reasoningMessage,
            startedAt: lastStepTime,
            endedAt: stepArrivedAt,
            durationMs,
            status: 'ok',
            attributes: { runId: this.runId, sessionId: this.sessionId, stepType: step.type },
          };

          this.emitClosedSpan(span, callbacks, {
            stepType: step.type,
            span: 'reasoning',
          }, reasoningMessage);

          trace.push({ kind: 'step', message: reasoningMessage, timestamp: stepArrivedAt, span: 'reasoning' });

        } else if (step.type === 'tool_call') {
          this.state.toolCalls.push({ toolId: step.toolId, parameters: step.parameters });
          const spanId = `tool-${step.toolId}-${Math.random().toString(36).slice(2, 8)}`;

          this.activeToolSpans.set(step.toolId, {
            spanId,
            startedAt: stepArrivedAt,
            parameters: step.parameters,
          });

          logger.info({
            eventType: 'span_start',
            traceId: this.runId,
            spanId,
            parentSpanId: this.rootSpanId,
            name: 'tool',
            toolId: step.toolId,
            runId: this.runId,
            sessionId: this.sessionId,
            agentName: this.name,
            model: this.runtimeMetadata.model,
          }, `tool_call:start:${step.toolId}`);

          trace.push({ kind: 'step', message: `tool:${step.toolId}`, timestamp: stepArrivedAt, span: 'tool' });

        } else if (step.type === 'tool_result') {
          const lastToolCall = this.state.toolCalls.at(-1);
          if (lastToolCall) {
            lastToolCall.result = step.result;
          }
          this.state.intermediateResults[step.toolId] = step.result;

          const pending = this.activeToolSpans.get(step.toolId);
          const startedAtSpan = pending?.startedAt ?? stepArrivedAt;
          const durationMs = stepArrivedAt - startedAtSpan;
          const spanId = pending?.spanId ?? `tool-${step.toolId}`;

          const span: AgentRuntimeSpan = {
            traceId: this.runId,
            spanId,
            parentSpanId: this.rootSpanId,
            name: 'tool',
            message: `tool:${step.toolId}`,
            startedAt: startedAtSpan,
            endedAt: stepArrivedAt,
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

          this.activeToolSpans.delete(step.toolId);
          this.emitClosedSpan(span, callbacks, {
            span: 'tool',
            toolId: step.toolId,
          }, `tool_call:end:${step.toolId}`);

          trace.push({ kind: 'step', message: `tool-result:${step.toolId}`, timestamp: stepArrivedAt, span: 'tool' });

        } else if (step.type === 'final') {
          this.state.intermediateResults.final = step.text;
          const spanId = `final-${Math.random().toString(36).slice(2, 8)}`;
          const durationMs = stepArrivedAt - lastStepTime;

          const span: AgentRuntimeSpan = {
            traceId: this.runId,
            spanId,
            parentSpanId: this.rootSpanId,
            name: 'final',
            message: step.text,
            startedAt: lastStepTime,
            endedAt: stepArrivedAt,
            durationMs,
            status: 'ok',
            attributes: { runId: this.runId, sessionId: this.sessionId },
          };

          this.emitClosedSpan(span, callbacks, {
            span: 'final',
          }, 'final output');

          trace.push({ kind: 'step', message: step.text, timestamp: stepArrivedAt, span: 'final' });
        }

        lastStepTime = Date.now();
      }

      const finalStep = steps.findLast((step) => step.type === 'final') as AgentStep | undefined;
      const completedAt = Date.now();
      this.state.status = AgentRuntimeStatus.completed;
      this.runtimeMetadata.latencyMs = completedAt - startedAt;

      // Close Root Span
      this.emitRootSpan('ok', startedAt, completedAt, undefined, otelRootSpan);

      trace.push({ kind: 'status', message: 'runtime completed', timestamp: completedAt });
      return {
        status: AgentRuntimeStatus.completed,
        runId: this.runId,
        startedAt,
        completedAt,
        output: finalStep ? { text: (finalStep as any).text } : {},
        steps,
        trace,
        spans: this.state.spans,
      };

    } catch (error) {
      const failedAt = Date.now();
      this.state.status = AgentRuntimeStatus.failed;
      this.runtimeMetadata.latencyMs = failedAt - startedAt;

      // Flush any active tool spans as failed
      for (const [toolId, pending] of this.activeToolSpans.entries()) {
        const span: AgentRuntimeSpan = {
          traceId: this.runId,
          spanId: pending.spanId,
          parentSpanId: this.rootSpanId,
          name: 'tool',
          message: `tool:${toolId}`,
          startedAt: pending.startedAt,
          endedAt: failedAt,
          durationMs: failedAt - pending.startedAt,
          status: 'error',
          attributes: { toolId, error: String(error) },
        };
        this.emitClosedSpan(span, callbacks, { span: 'tool', toolId }, `tool_call:error:${toolId}`);
      }
      this.activeToolSpans.clear();

      // Close Root Span with Error
      this.emitRootSpan('error', startedAt, failedAt, String(error), otelRootSpan);

      trace.push({ kind: 'status', message: 'runtime failed', timestamp: failedAt });
      return {
        status: AgentRuntimeStatus.failed,
        runId: this.runId,
        startedAt,
        completedAt: failedAt,
        steps,
        error: error instanceof Error ? error.message : String(error),
        trace,
        spans: this.state.spans,
      };
    }
  }

  private emitClosedSpan(
    span: AgentRuntimeSpan,
    callbacks?: AgentRuntimeCallbacks,
    extraContext: Record<string, unknown> = {},
    logMessage: string = '',
  ) {
    this.state.spans.push(span);
    callbacks?.onSpan?.(span);

    const otelSpan = this.tracer?.startSpan(this.getOtelSpanName(span.name), {
      attributes: {
        'agent.name': this.name,
        'agent.run_id': this.runId,
        'agent.session_id': this.sessionId,
        'agent.span_id': span.spanId,
        'agent.parent_span_id': span.parentSpanId ?? '',
        'agent.span_name': span.name,
        'agent.tool_id': typeof span.attributes?.toolId === 'string' ? span.attributes.toolId : '',
      },
    });

    if (otelSpan) {
      otelSpan.setAttribute('agent.duration_ms', span.durationMs ?? 0);
      otelSpan.setAttribute('agent.message', span.message);
      otelSpan.setStatus({ code: span.status === 'ok' ? 0 : 2, message: span.status });
      otelSpan.end();
    }

    logger.info({
      eventType: 'span_end',
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      name: span.name,
      message: span.message,
      startedAt: span.startedAt,
      endedAt: span.endedAt,
      durationMs: span.durationMs,
      status: span.status,
      runId: this.runId,
      sessionId: this.sessionId,
      agentName: this.name,
      model: this.runtimeMetadata.model,
      ...extraContext,
    }, logMessage);
  }

  private emitRootSpan(status: 'ok' | 'error', startedAt: number, endedAt: number, errorMessage?: string, otelRootSpan?: Span) {
    const runtimeRootSpan: AgentRuntimeSpan = {
      traceId: this.runId,
      spanId: this.rootSpanId,
      name: 'root',
      message: `agent_run:${this.name}`,
      startedAt,
      endedAt,
      durationMs: endedAt - startedAt,
      status,
      attributes: {
        runId: this.runId,
        sessionId: this.sessionId,
        agentName: this.name,
        error: errorMessage,
      },
    };

    this.state.spans.unshift(runtimeRootSpan);

    otelRootSpan?.setStatus({ code: status === 'ok' ? 0 : 2, message: errorMessage ?? (status === 'ok' ? 'ok' : 'error') });
    otelRootSpan?.end();

    logger.info({
      eventType: 'span_end',
      traceId: runtimeRootSpan.traceId,
      spanId: runtimeRootSpan.spanId,
      name: runtimeRootSpan.name,
      message: runtimeRootSpan.message,
      startedAt,
      endedAt,
      durationMs: runtimeRootSpan.durationMs,
      status,
      runId: this.runId,
      sessionId: this.sessionId,
      agentName: this.name,
      model: this.runtimeMetadata.model,
      error: errorMessage,
    }, `agent_run:end:${this.name}`);
  }

  private getOtelSpanName(name: AgentRuntimeSpan['name']): string {
    switch (name) {
      case 'tool':
        return 'agent.tool.call';
      case 'final':
        return 'agent.final';
      case 'reasoning':
        return 'agent.reasoning';
      default:
        return 'agent.runtime';
    }
  }
}
