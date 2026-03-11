import type { Edge, Node } from "@xyflow/react";

type SyncMessage = {
  type: "graph:update";
  nodes: Node[];
  edges: Edge[];
  senderId: string;
};

export class RoomSyncClient {
  private ws: WebSocket | null = null;
  private senderId = crypto.randomUUID();

  connect(roomId: string, onGraph: (nodes: Node[], edges: Edge[]) => void): void {
    const base = import.meta.env.VITE_SYNC_WS_URL ?? "ws://localhost:8787";
    this.ws = new WebSocket(`${base}/room/${roomId}/ws`);

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as SyncMessage;
      if (data.type === "graph:update" && data.senderId !== this.senderId) {
        onGraph(data.nodes, data.edges);
      }
    };
  }

  broadcast(nodes: Node[], edges: Edge[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message: SyncMessage = {
      type: "graph:update",
      nodes,
      edges,
      senderId: this.senderId
    };

    this.ws.send(JSON.stringify(message));
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }
}