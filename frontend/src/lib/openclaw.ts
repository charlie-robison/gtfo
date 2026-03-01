export interface OpenClawResponse {
  id: string;
  output: Array<{
    type: string;
    content?: Array<{ type: string; text: string }>;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

/**
 * Send a natural-language prompt to the OpenClaw agent API
 * via the Next.js proxy route (avoids CORS).
 */
export async function askOpenClaw(
  message: string,
  stream = false
): Promise<OpenClawResponse> {
  const res = await fetch("/api/openclaw", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openclaw",
      input: message,
      stream,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenClaw request failed (${res.status}): ${text}`);
  }

  return res.json();
}
