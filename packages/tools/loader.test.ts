import { test, expect } from 'bun:test';
import { runTool } from './loader';

const originalFetch = globalThis.fetch;

test('runTool can load nested github tools from registry importPath', async () => {
  process.env.GITHUB_TOKEN = 'fake-token';
  process.env.REPO_OWNER = 'example';
  process.env.REPO_NAME = 'repo';

  globalThis.fetch = async () => {
    return {
      ok: true,
      json: async () => ({ total_count: 0, items: [] }),
      text: async () => '[]'
    } as any;
  };

  const result = await runTool('github/search_issues', { query: 'bug', state: 'open' });

  expect(result).toEqual({ total: 0, issues: [] });
});

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});
