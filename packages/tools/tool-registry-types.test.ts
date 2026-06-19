import { test, expect } from 'bun:test';
import { filterToolsByMode } from './tool-registry-types';
import registry from './registry.json' assert { type: 'json' };

test('filterToolsByMode: support-agent gets support-only tools', () => {
  const supportTools = filterToolsByMode(registry, 'support');
  
  // smoke is support-only, so it should be in support tools
  expect(supportTools.some((t) => t.name === 'smoke')).toBe(true);
  
  // GitHub tools should be available (no modes restriction)
  expect(supportTools.some((t) => t.name === 'github/create_issue')).toBe(true);
});

test('filterToolsByMode: coding-agent excludes support-only tools', () => {
  const codingTools = filterToolsByMode(registry, 'coding');
  
  // smoke is support-only, so it should NOT be in coding tools
  expect(codingTools.some((t) => t.name === 'smoke')).toBe(false);
  
  // GitHub tools should still be available (no modes restriction)
  expect(codingTools.some((t) => t.name === 'github/create_issue')).toBe(true);
  
  // Filesystem tools should be available
  expect(codingTools.some((t) => t.name === 'fs/read')).toBe(true);
});

test('filterToolsByMode: tools without modes are available to both', () => {
  const supportTools = filterToolsByMode(registry, 'support');
  const codingTools = filterToolsByMode(registry, 'coding');
  
  // GitHub tools have no modes restriction, should be in both
  const githubCreateInSupport = supportTools.some((t) => t.name === 'github/create_issue');
  const githubCreateInCoding = codingTools.some((t) => t.name === 'github/create_issue');
  
  expect(githubCreateInSupport && githubCreateInCoding).toBe(true);
});
