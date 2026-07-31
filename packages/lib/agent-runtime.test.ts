import { test, expect } from 'bun:test';
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { AgentRuntime, AgentRuntimeStatus } from './agent-runtime';

async function* sampleAgent() {
  yield {
    type: 'thinking',
    timestamp: Date.now(),
    message: 'planning',
  } as any;

  yield {
    type: 'final',
    timestamp: Date.now(),
    text: 'done',
  } as any;
}

test('tracks lifecycle and captures final output for a streamed agent run', async () => {
  const runtime = new AgentRuntime({
    name: 'demo-runtime',
    sessionId: 'session-demo',
    input: 'hello',
  });

  const result = await runtime.run(sampleAgent);

  expect(result.status).toBe(AgentRuntimeStatus.completed);
  expect(result.steps).toHaveLength(2);
  expect(result.output).toEqual({ text: 'done' });
  expect(result.startedAt).toBeGreaterThan(0);
  expect(result.completedAt).toBeGreaterThanOrEqual(result.startedAt);
});

test('marks the run failed when the agent throws', async () => {
  const runtime = new AgentRuntime({
    name: 'failing-runtime',
    sessionId: 'session-error',
    input: 'boom',
  });

  async function* failingAgent() {
    throw new Error('agent exploded');
  }

  const result = await runtime.run(failingAgent);

  expect(result.status).toBe(AgentRuntimeStatus.failed);
  expect(result.error).toContain('agent exploded');
  expect(result.steps).toHaveLength(0);
});

test('records lifecycle trace events for each execution', async () => {
  const runtime = new AgentRuntime({
    name: 'trace-runtime',
    sessionId: 'session-trace',
    input: 'trace me',
  });

  const result = await runtime.run(sampleAgent);

  expect(result.trace.map((event) => event.kind)).toEqual(['status', 'step', 'step', 'status']);
  expect(result.trace[0].message).toContain('started');
  expect(result.trace.at(-1)?.message).toContain('completed');
});

test('emits progress callbacks as steps are produced', async () => {
  const runtime = new AgentRuntime({
    name: 'callback-runtime',
    sessionId: 'session-callback',
    input: 'callback me',
  });

  const seen: string[] = [];
  const result = await runtime.run(sampleAgent, {
    onStep: (step) => seen.push(step.type),
  });

  expect(seen).toEqual(['thinking', 'final']);
  expect(result.steps).toHaveLength(2);
});

test('emits a reasoning span for thinking steps', async () => {
  const runtime = new AgentRuntime({
    name: 'span-runtime',
    sessionId: 'session-span',
    input: 'reasoning please',
  });

  const result = await runtime.run(sampleAgent);

  expect(result.trace.some((event) => event.span === 'reasoning')).toBe(true);
  expect(result.trace.find((event) => event.span === 'reasoning')?.message).toContain('planning');
  expect(result.spans.some((span) => span.name === 'reasoning')).toBe(true);
});

test('captures runtime metadata for observability', async () => {
  const runtime = new AgentRuntime({
    name: 'meta-runtime',
    sessionId: 'session-meta',
    input: 'metadata please',
    model: 'qwen3:8b',
  });

  const result = await runtime.run(sampleAgent);

  expect(runtime.runtimeMetadata.agentName).toBe('meta-runtime');
  expect(runtime.runtimeMetadata.sessionId).toBe('session-meta');
  expect(runtime.runtimeMetadata.runId).toContain('meta-runtime');
  expect(runtime.runtimeMetadata.model).toBe('qwen3:8b');
  expect(runtime.runtimeMetadata.latencyMs).toBeGreaterThanOrEqual(0);
  expect(result.spans.length).toBeGreaterThan(0);
});

test('emits live span callbacks while the runtime is streaming', async () => {
  const runtime = new AgentRuntime({
    name: 'live-span-runtime',
    sessionId: 'session-live-span',
    input: 'stream spans',
  });

  const seenSpans: string[] = [];
  await runtime.run(sampleAgent, {
    onSpan: (span) => seenSpans.push(span.name),
  });

  expect(seenSpans).toContain('reasoning');
  expect(seenSpans).toContain('final');
});

test('captures structured trace metadata and tool span duration', async () => {
  const runtime = new AgentRuntime({
    name: 'trace-span-runtime',
    sessionId: 'session-trace-span',
    input: 'trace spans',
  });

  async function* tracedAgent() {
    yield {
      type: 'tool_call',
      timestamp: Date.now(),
      toolId: 'search/issues',
      parameters: { query: 'bug' },
    } as any;

    yield {
      type: 'tool_result',
      timestamp: Date.now() + 15,
      toolId: 'search/issues',
      result: { total: 1 },
    } as any;
  }

  const result = await runtime.run(tracedAgent);
  const toolSpan = result.spans.find((span) => span.name === 'tool');

  expect(toolSpan).toBeDefined();
  expect(toolSpan?.traceId).toBe(runtime.runId);
  expect(toolSpan?.spanId).toBeDefined();
  expect(toolSpan?.durationMs).toBeGreaterThanOrEqual(0);
  expect(toolSpan?.status).toBe('ok');
  expect(toolSpan?.attributes?.toolId).toBe('search/issues');
});

test('emits otel spans for runtime steps', async () => {
  const exporter = new InMemorySpanExporter();
  const provider = new BasicTracerProvider();
  provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
  const tracer = provider.getTracer('agent-runtime-test');

  const runtime = new AgentRuntime({
    name: 'otel-runtime',
    sessionId: 'session-otel',
    input: 'otel please',
    telemetry: { tracer },
  });

  await runtime.run(async function* () {
    yield {
      type: 'tool_call',
      timestamp: Date.now(),
      toolId: 'search/issues',
      parameters: { query: 'bug' },
    } as any;

    yield {
      type: 'tool_result',
      timestamp: Date.now() + 5,
      toolId: 'search/issues',
      result: { total: 1 },
    } as any;

    yield {
      type: 'final',
      timestamp: Date.now() + 10,
      text: 'done',
    } as any;
  });

  const spans = exporter.getFinishedSpans();
  expect(spans.some((span) => span.name === 'agent.runtime')).toBe(true);
  expect(spans.some((span) => span.name === 'agent.tool.call')).toBe(true);
  expect(spans.some((span) => span.name === 'agent.final')).toBe(true);
});
