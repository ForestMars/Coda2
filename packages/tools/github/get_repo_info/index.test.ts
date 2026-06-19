import { test, expect } from 'bun:test';
import { runTool } from '../../loader';

test('runTool can get repository info', async () => {
  process.env.REPO_OWNER = 'TestOwner';
  process.env.REPO_NAME = 'test-repo';

  const result = await runTool('github/get_repo_info', {});

  expect(result).toEqual({
    owner: 'TestOwner',
    repo: 'test-repo',
    fullName: 'TestOwner/test-repo',
  });
});

test('get_repo_info fails gracefully when repo not configured', async () => {
  delete process.env.REPO_OWNER;
  delete process.env.REPO_NAME;

  try {
    await runTool('github/get_repo_info', {});
    expect.unreachable('Should have thrown an error');
  } catch (error) {
    expect(error instanceof Error).toBe(true);
    expect((error as Error).message).toContain('Repository not configured');
  }
});
