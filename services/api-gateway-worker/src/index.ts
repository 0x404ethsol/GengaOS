import { Hono } from "hono";

type Env = {
  CONTROL_API_BASE: string;
  CONTROL_API_INTERNAL_TOKEN?: string;
};

const app = new Hono<{ Bindings: Env }>();

app.get("/health", (c) => c.json({ status: "ok", service: "api-gateway-worker" }));

app.post("/v1/sync/room-token", async (c) => {
  const payload = await c.req.json();
  const upstream = await fetch(`${c.env.CONTROL_API_BASE}/v1/sync/room-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-genga-internal-token": c.env.CONTROL_API_INTERNAL_TOKEN ?? "",
    },
    body: JSON.stringify(payload),
  });

  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
});

app.all("/v1/*", async (c) => {
  const incomingUrl = new URL(c.req.url);
  const upstream = await fetch(`${c.env.CONTROL_API_BASE}${incomingUrl.pathname}${incomingUrl.search}`, {
    method: c.req.method,
    headers: {
      "Content-Type": c.req.header("content-type") ?? "application/json",
      Authorization: c.req.header("authorization") ?? "",
      "x-genga-internal-token": c.env.CONTROL_API_INTERNAL_TOKEN ?? "",
    },
    body: ["GET", "HEAD"].includes(c.req.method) ? undefined : await c.req.text(),
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
});

export default app;
