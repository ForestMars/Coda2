import { test, expect } from 'bun:test';
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
