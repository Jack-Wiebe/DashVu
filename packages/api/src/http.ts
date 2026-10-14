import "server-only";

const DEFAULT_USER_AGENT = "DashVu/0.1 (+https://dashvu.app; contact: maintainer@dashvu.app)";

export const USER_AGENT = process.env.DASHVU_USER_AGENT?.trim() || DEFAULT_USER_AGENT;

const RETRY_STATUS = new Set([429, 502, 503, 504]);
const DEFAULT_RETRIES = 2;
const MAX_RETRY_DELAY_MS = 5000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(response: Response | null, attempt: number): number {
  const retryAfter = response?.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS);
    }
    const date = Date.parse(retryAfter);
    if (!Number.isNaN(date)) {
      return Math.min(Math.max(date - Date.now(), 0), MAX_RETRY_DELAY_MS);
    }
  }
  return Math.min(1000 * 2 ** attempt, MAX_RETRY_DELAY_MS);
}

export async function fetchWithRetry(
  input: string | URL,
  init: RequestInit & { retries?: number } = {}
): Promise<Response> {
  const { retries = DEFAULT_RETRIES, headers, ...rest } = init;
  const mergedHeaders = new Headers(headers);
  if (!mergedHeaders.has("user-agent")) {
    mergedHeaders.set("user-agent", USER_AGENT);
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(input, { ...rest, headers: mergedHeaders });
      if (RETRY_STATUS.has(response.status) && attempt < retries) {
        await sleep(retryDelayMs(response, attempt));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(retryDelayMs(null, attempt));
        continue;
      }
    }
  }

  throw lastError ?? new Error("fetchWithRetry failed");
}
