import { test, expect } from 'bun:test';
import { AgentRuntime, AgentRuntimeStatus } from './agent-runtime';

async function* sampleAgent() {
  yield {
    type: 'tool_call',
    timestamp: Date.now(),
    toolId: 'github/search_issues',
    toolName: 'github/search_issues',
    parameters: { query: 'bug' },
  } as any;

  yield {
    type: 'tool_result',
    timestamp: Date.now(),
    toolId: 'github/search_issues',
    result: { total: 1 },
  } as any;

  yield {
    type: 'final',
    timestamp: Date.now(),
    text: 'done',
  } as any;
}

test('stores tool activity and final output in runtime state', async () => {
  const runtime = new AgentRuntime({
    name: 'state-runtime',
    sessionId: 'state-session',
    input: 'inspect state',
  });

  await runtime.run(sampleAgent);

  expect(runtime.state.status).toBe(AgentRuntimeStatus.completed);
  expect(runtime.state.toolCalls).toHaveLength(1);
  expect(runtime.state.intermediateResults['github/search_issues']).toEqual({ total: 1 });
  expect(runtime.state.intermediateResults.final).toBe('done');
});

test('accepts an agent-style callable that uses input, session, and options', async () => {
  const runtime = new AgentRuntime({
    name: 'callable-runtime',
    sessionId: 'callable-session',
    input: 'callable input',
  });

  const agent = async function* (
    input: string,
    session: { id: string; events: unknown[] },
    opts?: Record<string, unknown>
  ) {
    expect(input).toBe('callable input');
    expect(session.id).toBe('callable-session');
    expect(opts).toBeDefined();
    yield { type: 'final', timestamp: Date.now(), text: 'ok' } as any;
  };

  const result = await runtime.run(agent as any);
  expect(result.status).toBe(AgentRuntimeStatus.completed);
  expect(result.output?.text).toBe('ok');
});
