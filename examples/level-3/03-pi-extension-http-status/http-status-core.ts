// The logic lives in a plain module with no Pi imports, so it can be unit-tested without Pi running.
// The Pi extension (index.ts) and the MCP server (../04-mcp-server.ts) both wrap this same code.

export type StatusResult = { url: string; status: number; ok: boolean; ms: number; redirectedTo?: string };

export type FetchLike = (
  url: string,
  init: { method: string; redirect: "manual"; signal?: AbortSignal },
) => Promise<{ status: number; headers: { get(name: string): string | null } }>;

export function parseUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    // The message is read by a model: say what to pass instead.
    throw new Error(`"${raw}" is not a valid URL. Pass a full URL such as https://example.com/health.`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Only http and https URLs are supported, got "${url.protocol}".`);
  }
  return url;
}

// Note: this lets the model reach any URL your machine can reach, including localhost and internal hosts.
// Level 4 covers limiting that (allow-lists, egress rules).
export async function checkStatus(raw: string, fetchImpl: FetchLike = fetch, timeoutMs = 10_000): Promise<StatusResult> {
  const url = parseUrl(raw);
  const started = performance.now();
  const res = await fetchImpl(url.href, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(timeoutMs) });
  return {
    url: url.href,
    status: res.status,
    ok: res.status >= 200 && res.status < 300,
    ms: Math.round(performance.now() - started),
    redirectedTo: res.headers.get("location") ?? undefined,
  };
}

export function formatResult(r: StatusResult): string {
  const base = `${r.url} -> ${r.status} (${r.ok ? "ok" : "not ok"}) in ${r.ms} ms`;
  return r.redirectedTo ? `${base}; redirects to ${r.redirectedTo}` : base;
}
