import { test, expect } from 'bun:test';
import { runTool } from './loader';

test('runTool can load nested github tools from registry importPath', async () => {
  process.env.GITHUB_TOKEN = 'fake-token';
  process.env.REPO_OWNER = 'example';
  process.env.REPO_NAME = 'repo';

  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    return {
      ok: true,
      json: async () => ({ total_count: 0, items: [] }),
      text: async () => '[]'
    } as any;
  };

  try {
    const result = await runTool('github/search_issues', { query: 'bug', state: 'open' });
    expect(result).toEqual({ total: 0, issues: [] });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
