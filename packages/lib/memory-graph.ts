/**
 * @file memory-graph.ts
 * @description In-Memory Graph Representation for Agent's World Model.
 *
 * Tickets and project issues are distinct domain records. The graph may
 * represent either when an explicit event records one; a chat message alone
 * never synthesizes either record.
 */

export type GraphNodeType =
  | 'ENTITY'
  | 'USER_METADATA'
  | 'SUPPORT_PROBLEM'
  | 'TICKET'
  | 'PROJECT_ISSUE';

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  properties: Record<string, any>;
  edges: string[];
  lastTouched: number;
}

export class MemoryGraph {
  public nodes: Map<string, GraphNode> = new Map();

  setNode(id: string, type: GraphNodeType, properties: Record<string, any> = {}) {
    const existing = this.nodes.get(id);
    this.nodes.set(id, {
      id,
      type,
      properties: { ...existing?.properties, ...properties },
      edges: existing?.edges || [],
      lastTouched: Date.now()
    });
  }

  addEdge(sourceId: string, targetId: string) {
    const source = this.nodes.get(sourceId);
    if (source && !source.edges.includes(targetId)) {
      source.edges.push(targetId);
    }
  }

  findUnresolvedConflict(): GraphNode | undefined {
    return Array.from(this.nodes.values())
      .find(n => n.properties.resolutionState === 'UNRESOLVED_CONFLICT');
  }

  findMostRecentEntity(): GraphNode | undefined {
    return Array.from(this.nodes.values())
      .filter(n => n.type === 'ENTITY')
      .sort((a, b) => b.lastTouched - a.lastTouched)[0];
  }

  serialize(): string {
    let out = '### KNOWLEDGE_GRAPH_STATE\n';
    const nodes = Array.from(this.nodes.values());

    const activeNodes = nodes.filter(n => n.properties.resolutionState !== 'RESOLVED');
    const archivedNodes = nodes.filter(n => n.properties.resolutionState === 'RESOLVED');

    if (activeNodes.length > 0) {
      out += '>> ACTIVE_CONTEXT_ITEMS:\n';
      activeNodes.forEach(n => {
        const state = n.properties.resolutionState ?? n.properties.status ?? 'ACTIVE';
        const context = n.properties.context ?? n.properties.workingContext ?? 'None';
        out += \` - [\${n.type}] ID: \${n.id} | STATE: \${state} | CONTEXT: \${context}\n\`;
      });
    }

    if (archivedNodes.length > 0) {
      out += '>> ARCHIVED_CONTEXT (RESOLVED):\n';
      archivedNodes.forEach(n => out += \` - [\${n.type}] ID: \${n.id}: RESOLVED\n\`);
    }

    return out;
  }
}
