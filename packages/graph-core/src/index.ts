export interface StudioNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface StudioEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  data?: Record<string, unknown>;
}

export interface GraphSnapshot {
  projectId: string;
  revision: number;
  nodes: StudioNode[];
  edges: StudioEdge[];
  camera?: { x: number; y: number; zoom: number };
}

export type NodeFactory = (id: string, x: number, y: number) => StudioNode;

export class NodeRegistry {
  private factories = new Map<string, NodeFactory>();

  register(type: string, factory: NodeFactory): void {
    this.factories.set(type, factory);
  }

  create(type: string, id: string, x: number, y: number): StudioNode {
    const factory = this.factories.get(type);
    if (!factory) {
      throw new Error(`Unknown node type: ${type}`);
    }
    return factory(id, x, y);
  }

  listTypes(): string[] {
    return [...this.factories.keys()];
  }
}

export function validateGraphConnectivity(nodes: StudioNode[], edges: StudioEdge[]): string[] {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const errors: string[] = [];

  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge ${edge.id} has missing source ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge ${edge.id} has missing target ${edge.target}`);
    }
  }

  return errors;
}

export function applyRevision(snapshot: GraphSnapshot, expectedRevision: number): GraphSnapshot {
  if (snapshot.revision !== expectedRevision) {
    throw new Error(`Revision conflict. Expected ${expectedRevision}, got ${snapshot.revision}`);
  }

  return {
    ...snapshot,
    revision: snapshot.revision + 1
  };
}
