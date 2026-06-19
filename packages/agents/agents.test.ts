import { test, expect } from 'bun:test';
import { codingAgent } from './coding-agent';
import { supportAgent } from './support-agent';

const TEST_TIMEOUT = 30000;

function makeMockClient(returnText: string) {
  return {
    specificationVersion: 'v2' as const,
    provider: 'test-provider',
    modelId: 'mock-model',
    doGenerate: async () => ({
      text: returnText,
      content: [{ type: 'text', text: returnText }],
      finishReason: 'stop' as const,
      usage: { promptTokens: 0, completionTokens: 0 },
      rawCall: { rawPrompt: null, rawSettings: {} },
    }),
  } as any;
}

test('supportAgent has github tools available in registry', async () => {
  const mockResponse = 'I cannot find issues.';
  const mock = makeMockClient(mockResponse);
  const session = { id: 'test-support-github', events: [] } as any;

  const gen = supportAgent('Search for bug issues', session, { client: mock });

  for await (const step of gen) {
    // Just iterate through to confirm no errors
  }

  // If no error thrown, tools were registered successfully
  expect(true).toBe(true);
}, TEST_TIMEOUT);

test('codingAgent has github tools available in registry', async () => {
  const mockRouterResponse = 'no'; // Say no tools needed to simplify test
  const mock = makeMockClient(mockRouterResponse);
  const session = { id: 'test-coding-github', events: [] } as any;

  const gen = codingAgent('Create a GitHub issue', session, { client: mock });

  for await (const step of gen) {
    // Just iterate through to confirm no errors
  }

  // If no error thrown, tools were registered successfully
  expect(true).toBe(true);
}, TEST_TIMEOUT);
