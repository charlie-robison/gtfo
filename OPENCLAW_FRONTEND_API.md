# OpenClaw API — Frontend Integration Guide

## Endpoint

```
POST https://cathodically-percolable-keaton.ngrok-free.dev/v1/responses
```

## Auth

All requests require a bearer token:

```
Authorization: Bearer 2f9966c337d88718b426df605894d5d87701a6a812005d5d
```

## Request Format

```json
{
  "model": "openclaw",
  "input": "your natural language message here",
  "stream": false
}
```

- `input` — Natural language. OpenClaw's agent figures out which action to take.
- `stream` — Set to `true` for SSE streaming (show response as it types). `false` for a single JSON response.

## TypeScript

```typescript
const OPENCLAW_URL = "https://cathodically-percolable-keaton.ngrok-free.dev/v1/responses";
const OPENCLAW_TOKEN = "2f9966c337d88718b426df605894d5d87701a6a812005d5d";

async function askOpenClaw(message: string) {
  const res = await fetch(OPENCLAW_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENCLAW_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openclaw",
      input: message,
      stream: false,
    }),
  });
  return await res.json();
}
```

## Example Calls by Feature

### Search for apartments

```json
{
  "model": "openclaw",
  "input": "Search for apartments in Sacramento under $3000, 3 bed 2 bath for John Doe, phone 5551234567, move-in 04/01/2026",
  "stream": false
}
```

### Check move status

```json
{
  "model": "openclaw",
  "input": "What's the status of all my moving jobs?",
  "stream": false
}
```

### Run moving pipeline

```json
{
  "model": "openclaw",
  "input": "Run the moving pipeline for 456 Oak Ave, Sacramento, CA 95814, move date 04/01/2026",
  "stream": false
}
```

### Update Amazon address

```json
{
  "model": "openclaw",
  "input": "Update my Amazon address to 456 Oak Ave, Sacramento, CA 95814, name John Doe, zip 95814, phone 5551234567",
  "stream": false
}
```

### Update CashApp / Southwest / DoorDash address

```json
{
  "model": "openclaw",
  "input": "Update my CashApp address to 456 Oak Ave, Sacramento, CA 95814",
  "stream": false
}
```

### Cancel lease

```json
{
  "model": "openclaw",
  "input": "Cancel my lease. Landlord email: landlord@example.com, tenant: John Doe, address: 123 Main St Sacramento CA 95814, lease ends June 30 2026, moving out June 30 2026",
  "stream": false
}
```

### Scan Gmail for services that need address updates

```json
{
  "model": "openclaw",
  "input": "Scan my Gmail to find services that have my old address at 123 Main St, Sacramento, CA 95814",
  "stream": false
}
```

### Order furniture

```json
{
  "model": "openclaw",
  "input": "Order all the recommended furniture on Amazon",
  "stream": false
}
```

### Get screenshots of a running browser agent

```json
{
  "model": "openclaw",
  "input": "Show me the latest screenshots for job jd7abc123",
  "stream": false
}
```

## Important Notes

- **Input is natural language** — no structured API calls needed. The agent parses the message and calls the right Convex endpoints.
- **Confirmation behavior** — The agent will ask for confirmation before destructive actions (applying to apartments, booking U-Haul, placing orders). To skip, say "Go ahead and..." or "Confirm and..."
- **Response time** — Expect 5-30 seconds depending on how many tools the agent calls.
- **ngrok URL may change** — If ngrok restarts, the URL changes. Get the current one from the ngrok terminal or run: `curl -s http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[0].public_url'`
- **Streaming** — Set `"stream": true` to receive Server-Sent Events (SSE) for real-time response rendering.
