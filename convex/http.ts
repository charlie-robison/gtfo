import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

function getFastapiUrl(): string {
  const url = process.env.FASTAPI_URL;
  if (!url) {
    throw new Error("FASTAPI_URL environment variable is not set. Set it in the Convex dashboard.");
  }
  return url;
}

// ── Helpers ─────────────────────────────────────────────────────

function corsHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function corsPreflightResponse(): Response {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

async function proxyPost(path: string, body: unknown): Promise<Response> {
  const FASTAPI_URL = getFastapiUrl();
  const resp = await fetch(`${FASTAPI_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "convex-backend",
      "ngrok-skip-browser-warning": "69420",
    },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  try {
    JSON.parse(text);
  } catch {
    return new Response(
      JSON.stringify({ error: "Upstream returned non-JSON", body: text.slice(0, 500) }),
      { status: 502, headers: corsHeaders() }
    );
  }
  return new Response(text, {
    status: resp.status,
    headers: corsHeaders(),
  });
}

async function proxyGet(path: string): Promise<Response> {
  const FASTAPI_URL = getFastapiUrl();
  const resp = await fetch(`${FASTAPI_URL}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "convex-backend",
      "ngrok-skip-browser-warning": "69420",
    },
  });
  const text = await resp.text();
  try {
    JSON.parse(text);
  } catch {
    return new Response(
      JSON.stringify({ error: "Upstream returned non-JSON", body: text.slice(0, 500) }),
      { status: 502, headers: corsHeaders() }
    );
  }
  return new Response(text, {
    status: resp.status,
    headers: corsHeaders(),
  });
}

// ── POST /search-rentals ────────────────────────────────────────

http.route({
  path: "/search-rentals",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    const body = await request.json();
    return proxyPost("/search-rentals", body);
  }),
});

http.route({
  path: "/search-rentals",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── POST /moving-pipeline ───────────────────────────────────────

http.route({
  path: "/moving-pipeline",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    const body = await request.json();
    return proxyPost("/moving-pipeline", body);
  }),
});

http.route({
  path: "/moving-pipeline",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── POST /cancel-current-lease ──────────────────────────────────

http.route({
  path: "/cancel-current-lease",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    const body = await request.json();
    return proxyPost("/cancel-current-lease", body);
  }),
});

http.route({
  path: "/cancel-current-lease",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── POST /update-address ────────────────────────────────────────

http.route({
  path: "/update-address",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    const body = await request.json();
    return proxyPost("/update-address", body);
  }),
});

http.route({
  path: "/update-address",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── POST /order-furniture ───────────────────────────────────────

http.route({
  path: "/order-furniture",
  method: "POST",
  handler: httpAction(async () => {
    return proxyPost("/order-furniture", {});
  }),
});

http.route({
  path: "/order-furniture",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── POST /determine-addresses ───────────────────────────────────

http.route({
  path: "/determine-addresses",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    const body = await request.json();
    return proxyPost("/determine-addresses", body);
  }),
});

http.route({
  path: "/determine-addresses",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── POST /setup-utilities ───────────────────────────────────────

http.route({
  path: "/setup-utilities",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    const body = await request.json();
    return proxyPost("/setup-utilities", body);
  }),
});

http.route({
  path: "/setup-utilities",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── GET /jobs/{job_id} ──────────────────────────────────────────

http.route({
  path: "/jobs",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const url = new URL(request.url);
    const jobId = url.searchParams.get("job_id");
    if (!jobId) {
      return new Response(
        JSON.stringify({ error: "job_id query parameter is required" }),
        { status: 400, headers: corsHeaders() }
      );
    }
    return proxyGet(`/jobs/${encodeURIComponent(jobId)}`);
  }),
});

http.route({
  path: "/jobs",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── GET /steps ──────────────────────────────────────────────────

http.route({
  path: "/steps",
  method: "GET",
  handler: httpAction(async () => proxyGet("/steps")),
});

http.route({
  path: "/steps",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── GET /search-constraints ─────────────────────────────────────

http.route({
  path: "/search-constraints",
  method: "GET",
  handler: httpAction(async () => proxyGet("/search-constraints")),
});

http.route({
  path: "/search-constraints",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── GET /house-information ──────────────────────────────────────

http.route({
  path: "/house-information",
  method: "GET",
  handler: httpAction(async () => proxyGet("/house-information")),
});

http.route({
  path: "/house-information",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── GET /redfin-applications ────────────────────────────────────

http.route({
  path: "/redfin-applications",
  method: "GET",
  handler: httpAction(async () => proxyGet("/redfin-applications")),
});

http.route({
  path: "/redfin-applications",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── GET /uhaul-information ──────────────────────────────────────

http.route({
  path: "/uhaul-information",
  method: "GET",
  handler: httpAction(async () => proxyGet("/uhaul-information")),
});

http.route({
  path: "/uhaul-information",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── GET /recommended-furniture ──────────────────────────────────

http.route({
  path: "/recommended-furniture",
  method: "GET",
  handler: httpAction(async () => proxyGet("/recommended-furniture")),
});

http.route({
  path: "/recommended-furniture",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── GET /amazon-order-summary ───────────────────────────────────

http.route({
  path: "/amazon-order-summary",
  method: "GET",
  handler: httpAction(async () => proxyGet("/amazon-order-summary")),
});

http.route({
  path: "/amazon-order-summary",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

export default http;
