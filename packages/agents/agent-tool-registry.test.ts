import { expect, test } from 'bun:test';
import { tools } from '@sup/tools';
import { filterToolsForAgent } from './agent-tool-registry';

test('support agent receives active GitHub tools from the MCP 2.0 registry', () => {
  const toolNames = filterToolsForAgent(tools, 'support')
    .map((tool) => tool.name)
    .sort();

  expect(toolNames).toEqual([
    'github.closes_issue',
    'github.comment_issue',
    'github.create_issue',
    'github.search_issues',
  ]);
});
