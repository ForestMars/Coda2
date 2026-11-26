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
      case 'USER_UPDATE':
        const text = event.payload.text;
        const activeConflict = Array.from(
          graph.nodes.values(),
        ).find(
          (n) =>
            n.properties.resolutionState ===
            'UNRESOLVED_CONFLICT',
        );

        if (activeConflict) {
          graph.setNode(
            activeConflict.id,
            activeConflict.type,
            {
              // Append the new input directly to the entity that is currently "broken"
              workingContext:
                `${activeConflict.properties.workingContext || ''} | New Detail: ${text}`.trim(),
            },
          );
        }

        // 1. Ensure a Root Issue exists
        let activeIssue = graph.findActiveIssue();
        if (!activeIssue) {
          const issueId = 'current_session_issue';
          graph.setNode(issueId, 'ISSUE', {
            status: 'OPEN',
            resolution: 'UNRESOLVED',
          });
          activeIssue = graph.nodes.get(issueId);
        }

        // 2. Extract Entities and PARENT them to the Issue
        const idMatch = text.match(/#?(\d{3,})/);
        if (idMatch) {
          const entityId = idMatch[1];
          graph.setNode(entityId, 'ENTITY', {
            id: entityId,
          });
          graph.addEdge(activeIssue!.id, entityId);
        }

        // 3. Update the Issue's working context (Sticky Memory)
        const currentContext =
          activeIssue!.properties.context || '';
        graph.setNode(activeIssue!.id, 'ISSUE', {
          context:
            `${currentContext} | User added: "${text}"`.trim(),
        });

        // 4. Handle Closing Signal
        if (
          text
            .toLowerCase()
            .match(
              /(thank you|thanks|resolved|that is all)/,
            )
        ) {
          graph.setNode(activeIssue!.id, 'ISSUE', {
            status: 'CLOSED',
            resolution: 'SATISFIED',
          });
        }
        break;

      case 'ASSISTANT_UPDATE':
        // Assistant turns belong to the conversational projection, not the world graph.
        break;

      case 'TOOL_RESULT':
        const { entityId, result } = event.payload;
        if (entityId) {
          graph.setNode(entityId, 'ENTITY', { ...result });
        }

        // If the tool fails, update the parent issue to reflect the conflict
        const issue = graph.findActiveIssue();
        if (issue && result.status === 'Not Found') {
          graph.setNode(issue.id, 'ISSUE', {
            resolution: 'CONFLICT_WAITING_FOR_USER_INFO',
            failedAttemptId: entityId,
          });
        }
        break;
    }
  }
  return graph;
}
