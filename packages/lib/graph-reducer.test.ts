import { test, expect } from 'bun:test';
import { rebuildGraph } from './graph-reducer';

test('a greeting does not synthesize a support ticket or project issue', () => {
  const graph = rebuildGraph([
    {
      type: 'USER_UPDATE',
      payload: { text: 'hi' },
      timestamp: 1,
    },
  ]);

  expect(graph.nodes.size).toBe(0);
  expect(graph.serialize()).toBe('### KNOWLEDGE_GRAPH_STATE\n');
});

test('an explicitly marked identifier is remembered as an entity, not an issue', () => {
  const graph = rebuildGraph([
    {
      type: 'USER_UPDATE',
      payload: { text: 'Can you check order #12345?' },
      timestamp: 1,
    },
  ]);

  expect(graph.nodes.get('12345')?.type).toBe('ENTITY');
  expect(graph.serialize()).toContain('[ENTITY] ID: 12345');
  expect(graph.serialize()).not.toContain('PROJECT_ISSUE');
  expect(graph.serialize()).not.toContain('TICKET');
});

test('ordinary numbers and conversational thanks do not create or close records', () => {
  const graph = rebuildGraph([
    {
      type: 'USER_UPDATE',
      payload: { text: 'I started on this in 2026.' },
      timestamp: 1,
    },
    {
      type: 'USER_UPDATE',
      payload: { text: 'Thanks, that is all.' },
      timestamp: 2,
    },
  ]);

  expect(graph.nodes.size).toBe(0);
});

test('a failed lookup is attached to its actual entity', () => {
  const graph = rebuildGraph([
    {
      type: 'USER_UPDATE',
      payload: { text: 'Please check order #999' },
      timestamp: 1,
    },
    {
      type: 'TOOL_RESULT',
      payload: {
        toolId: 'orders.lookup',
        entityId: '999',
        result: { status: 'Not Found' },
      },
      timestamp: 2,
    },
  ]);

  expect(graph.nodes.get('999')?.properties.resolutionState).toBe('UNRESOLVED_CONFLICT');
  expect(graph.serialize()).toContain('UNRESOLVED_CONFLICT');
  expect(graph.serialize()).not.toContain('ISSUE');
});
