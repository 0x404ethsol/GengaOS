import { Hono } from "hono";

type Env = {
  ROOM: DurableObjectNamespace;
};

const app = new Hono<{ Bindings: Env }>();

app.get("/health", (c) => c.json({ status: "ok", service: "sync-worker" }));

app.get("/room/:roomId/ws", async (c) => {
  const roomId = c.req.param("roomId");
  const id = c.env.ROOM.idFromName(roomId);
  const stub = c.env.ROOM.get(id);
  return stub.fetch(c.req.raw);
});

app.get("/room/:roomId/snapshot", async (c) => {
  const roomId = c.req.param("roomId");
  const id = c.env.ROOM.idFromName(roomId);
  const stub = c.env.ROOM.get(id);
  return stub.fetch(`https://sync.internal/snapshot/${roomId}`);
});

app.put("/room/:roomId/snapshot", async (c) => {
  const roomId = c.req.param("roomId");
  const id = c.env.ROOM.idFromName(roomId);
  const stub = c.env.ROOM.get(id);
  return stub.fetch(`https://sync.internal/snapshot/${roomId}`, {
    method: "PUT",
    body: await c.req.text(),
  });
});

export class RoomDurableObject {
  private state: DurableObjectState;
  private sockets = new Set<WebSocket>();
  private snapshot = JSON.stringify({ nodes: [], edges: [] });

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.includes("/ws")) {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.acceptSocket(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname.includes("/snapshot") && request.method === "PUT") {
      this.snapshot = await request.text();
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.includes("/snapshot")) {
      return new Response(this.snapshot, {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
  }

  private acceptSocket(socket: WebSocket): void {
    socket.accept();
    this.sockets.add(socket);

    socket.addEventListener("message", (event) => {
      this.snapshot = String(event.data);
      for (const peer of this.sockets) {
        if (peer !== socket) {
          peer.send(String(event.data));
        }
      }
    });

    socket.addEventListener("close", () => {
      this.sockets.delete(socket);
    });
  }
}

export default app;