import { test, expect } from 'bun:test';
import { supportAgent } from '@sup/agents/support-agent';
import { entityLookupTool } from '@sup/tools/order-tools';

const TEST_TIMEOUT = 90000; 

/**
 * Mock client that adheres to the AI SDK LanguageModelV2 spec.
 * This prevents the UnsupportedModelVersionError.
 */
function makeMockClient(returnText: string) {
  return {
    specificationVersion: 'v2' as const,
    provider: 'test-provider',
    modelId: 'mock-model',
    doGenerate: async () => ({
      text: returnText,
      // The SDK needs this content array to filter for tool calls internally
      content: [{ type: 'text', text: returnText }], 
      finishReason: 'stop' as const,
      usage: { promptTokens: 0, completionTokens: 0 },
      rawCall: { rawPrompt: null, rawSettings: {} },
    }),
  } as any;
}

test('agent calls entityLookupTool when LLM triggers tool path', async () => {
  // We mock the first LLM pass to return a JSON string that triggers the tool logic
  const mockToolTrigger = JSON.stringify({ tool: 'invoice-status', entityId: '12345' });
  const mock = makeMockClient(mockToolTrigger);
  
  const tools = {
    'invoice-status': entityLookupTool,
    'invoice-status-lookup': entityLookupTool,
    'order-lookup': entityLookupTool,
    'entity-status-lookup': entityLookupTool,
    'entity-lookup': entityLookupTool,
  } as any;

  const session = { id: 'test-session', events: [] } as any;
  const gen = supportAgent('Please check order #12345', session, { client: mock, tools });
  
  let toolCallSeen = false;
  let finalText = '';

  for await (const step of gen) {
    if (step.type === 'tool_call') {
      toolCallSeen = true;
      expect(step.parameters.entityId).toBe('12345');
    }
    if (step.type === 'final') {
      finalText = step.text;
    }
  }

  expect(toolCallSeen).toBe(true);
  // In our tool-branching logic, the "final" text comes from the second synthesis pass.
  // With this mock, it might just be the JSON again, but the plumbing is verified.
  expect(finalText).toBeTruthy();
}, TEST_TIMEOUT);

test('agent returns direct text when no tool invocation needed', async () => {
  const greeting = 'Hello — I am your assistant';
  const mock = makeMockClient(greeting);
  
  const tools = {
    'entity-status-lookup': entityLookupTool,
  } as any;

  const session = { id: 'test-session-2', events: [] } as any;
  const gen = supportAgent('Say hello', session, { client: mock, tools });
  
  const steps: string[] = [];
  let finalText = '';

  for await (const step of gen) {
    steps.push(step.type);
    if (step.type === 'final') {
      finalText = step.text;
    }
  }

  // Verify the sequence: should just be thinking -> final
  expect(steps).toContain('thinking');
  expect(steps).toContain('final');
  expect(steps).not.toContain('tool_call');
  expect(finalText.toLowerCase()).toContain('hello');
  expect(finalText.length).toBeGreaterThan(5);
}, TEST_TIMEOUT);

test.skip('agent remembers order #999 when context is added in second turn', async () => {
  const session: AgentSession = { id: 'test-amnesia-fix', events: [] };
  
  // Turn 1: Initial query
  const tools = {
    'entity-status-lookup': entityLookupTool,
    'order-lookup': entityLookupTool,
  } as any;

  const turn1Gen = supportAgent('Where is #999?', session, { tools });
  for await (const __ of turn1Gen) {} // Let it run and fail tool lookup

  // Turn 2: Add context (The "January 18" turn)
  const turn2Gen = supportAgent('I ordered it on January 18', session, { tools });
  let turn2Final = '';
  for await (const step of turn2Gen) {
    if (step.type === 'final') turn2Final = step.text;
  }

  // ASSERTION: It should NOT ask "which order?" 
  // because it should see #999 in the Graph linked to the Issue.
  expect(turn2Final).not.toMatch(/which order/i);
  expect(turn2Final).toMatch(/999/);
}, TEST_TIMEOUT);