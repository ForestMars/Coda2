import { expect, test } from 'bun:test';
import { resolveGitHubConfig } from './config';

test('uses GH_REPO and legacy REPO_OWNER for the configured repository', async () => {
  const config = await resolveGitHubConfig({
    GITHUB_TOKEN: 'test-token',
    GH_REPO: 'coffee',
    REPO_OWNER: 'ForestMars',
  });

  expect(config).toEqual({
    token: 'test-token',
    owner: 'ForestMars',
    repo: 'coffee',
  });
});

test('accepts a fully qualified GH_REPO without separate owner configuration', async () => {
  const config = await resolveGitHubConfig({
    GITHUB_TOKEN: 'test-token',
    GH_REPO: 'ForestMars/coffee',
  });

  expect(config).toEqual({
    token: 'test-token',
    owner: 'ForestMars',
    repo: 'coffee',
  });
});

test('discovers the authenticated account when GH_REPO is a name and no owner is set', async () => {
  const config = await resolveGitHubConfig(
    {
      GITHUB_TOKEN: 'test-token',
      GH_REPO: 'coffee',
    },
    async (input, init) => {
      expect(input).toBe('https://api.github.com/user');
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-token');
      return new Response(JSON.stringify({ login: 'ForestMars' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  );

  expect(config).toEqual({
    token: 'test-token',
    owner: 'ForestMars',
    repo: 'coffee',
  });
});

test('reports missing credentials before attempting a GitHub request', async () => {
  await expect(
    resolveGitHubConfig({ GH_REPO: 'coffee' }),
  ).rejects.toThrow('GITHUB_TOKEN');
});

test('reports missing repository configuration', async () => {
  await expect(
    resolveGitHubConfig({ GITHUB_TOKEN: 'test-token' }),
  ).rejects.toThrow('GH_REPO');
});
