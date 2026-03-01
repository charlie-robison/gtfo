const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? "";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${CONVEX_SITE_URL}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getRedfinApplications() {
  return fetchJson<any[]>("/redfin-applications");
}

export async function getScreenshotsByJobId(jobId: string) {
  return fetchJson<any[]>(`/screenshots?job_id=${jobId}`);
}

export async function getJob(jobId: string) {
  return fetchJson<any>(`/jobs?job_id=${jobId}`);
}
