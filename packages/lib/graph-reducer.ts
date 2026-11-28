/**
 * @file graph-reducer.ts
 * @description Event-Sourced Graph Reducer to Reconstruct MemoryGraph from Agent Events.
 */

import { MemoryGraph } from './memory-graph';
import type { AgentEvent } from '@sup/types/types';

export function rebuildGraph(
  history: AgentEvent[],
): MemoryGraph {
  const graph = new MemoryGraph();

  // Ensure correct replay order
  const events = [...(history || [])].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  for (const event of events) {
    switch (event.type) {
      case 'USER_UPDATE': {
        const text = event.payload.text;

        const activeConflict = graph.findUnresolvedConflict();
        if (activeConflict) {
          graph.setNode(
            activeConflict.id,
            activeConflict.type,
            {
              // Keep follow-up details with the entity that actually failed.
              workingContext:
                \`\${activeConflict.properties.workingContext || ''} | New Detail: \${text}\`.trim(),
            },
          );
        }

        // Only retain an explicitly marked identifier. A user message does not
        // create a support ticket or a project issue.
        const idMatch = text.match(/#(\d{3,})\b/);
        if (idMatch) {
          const entityId = idMatch[1];
          graph.setNode(entityId, 'ENTITY', {
            id: entityId,
          });
        }

        // Generic conversational language ("thanks", "resolved", etc.) does
        // not close a ticket or project issue. Those are explicit domain actions.
        break;
      }

      case 'TOOL_RESULT': {
        const { entityId, result } = event.payload;

        // Older or non-entity tool events may not identify an entity.
        // Do not create a graph node with an undefined ID.
        if (!entityId) break;

        const resultProperties =
          result && typeof result === 'object' && !Array.isArray(result)
            ? result
            : { result };

        graph.setNode(entityId, 'ENTITY', resultProperties);

        if (result?.status === 'Not Found') {
          graph.setNode(entityId, 'ENTITY', {
            resolutionState: 'UNRESOLVED_CONFLICT',
          });
        }
        break;
      }
    }
  }

  return graph;
}
