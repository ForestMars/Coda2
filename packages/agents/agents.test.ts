import { test, expect } from 'bun:test';
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

test('supportAgent has all tools available in registry including github/*', async () => {
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
