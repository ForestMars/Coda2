import { expect, test } from 'bun:test';
import { buildSupportToolSet } from './support-agent';

test('adapts canonical MCP inputSchema into an AI SDK tool and executes through runTool', async () => {
  const manifest = [
    {
      name: 'github.create_issue',
      description: 'Create an issue in the configured repository.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          body: { type: 'string' },
        },
        required: ['title'],
      },
    },
  ];
  const args = { title: 'test', body: 'this is just a test' };
  let received: unknown[] = [];

  const toolSet = buildSupportToolSet(manifest, async (name, input) => {
    received = [name, input];
    return { issue_number: 1, url: 'https://github.com/example/repo/issues/1' };
  });

  const createIssue = toolSet['github.create_issue'] as any;
  expect(createIssue.inputSchema).toBeDefined();
  await expect(createIssue.execute(args)).resolves.toEqual({
    issue_number: 1,
    url: 'https://github.com/example/repo/issues/1',
  });
  expect(received).toEqual(['github.create_issue', args]);
});
