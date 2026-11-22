import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { USER_AGENT, fetchWithRetry } from "./http";

const FEED_URL = "https://feeds.example.test/news.xml";

const response = (status: number, headers: Record<string, string> = {}): Response =>
  new Response("{}", { status, headers });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("USER_AGENT", () => {
  it("is a non-empty string", () => {
    expect(typeof USER_AGENT).toBe("string");
    expect(USER_AGENT.length).toBeGreaterThan(0);
  });
});

describe("fetchWithRetry", () => {
  it("sets the default user-agent and returns the first response", async () => {
    fetchMock.mockResolvedValueOnce(response(200));
    const res = await fetchWithRetry(FEED_URL);
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get("user-agent")).toBe(USER_AGENT);
  });

  it("keeps a caller-provided user-agent", async () => {
    fetchMock.mockResolvedValueOnce(response(200));
    await fetchWithRetry(FEED_URL, { headers: { "user-agent": "custom/1.0" } });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get("user-agent")).toBe("custom/1.0");
  });

  it("does not retry non-retryable statuses", async () => {
    fetchMock.mockResolvedValue(response(404));
    const res = await fetchWithRetry(FEED_URL, { retries: 3 });
    expect(res.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a retryable status when retry-after is zero", async () => {
    fetchMock
      .mockResolvedValueOnce(response(503, { "retry-after": "0" }))
      .mockResolvedValueOnce(response(200));
    const res = await fetchWithRetry(FEED_URL);
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("honours an HTTP-date retry-after in the past", async () => {
    fetchMock
      .mockResolvedValueOnce(
        response(503, { "retry-after": new Date(Date.now() - 60_000).toUTCString() })
      )
      .mockResolvedValueOnce(response(200));
    const res = await fetchWithRetry(FEED_URL);
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns the last response when retries are exhausted", async () => {
    fetchMock.mockResolvedValue(response(503, { "retry-after": "0" }));
    const res = await fetchWithRetry(FEED_URL, { retries: 1 });
    expect(res.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses exponential backoff when no retry-after is given", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    fetchMock.mockResolvedValueOnce(response(503)).mockResolvedValueOnce(response(200));
    const promise = fetchWithRetry(FEED_URL, { retries: 1 });
    await flushMicrotasks();
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const res = await promise;
    expect(res.status).toBe(200);
  });

  it("caps retry-after delays at five seconds", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    fetchMock
      .mockResolvedValueOnce(response(503, { "retry-after": "60" }))
      .mockResolvedValueOnce(response(200));
    const promise = fetchWithRetry(FEED_URL, { retries: 1 });
    await flushMicrotasks();
    await vi.advanceTimersByTimeAsync(4999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const res = await promise;
    expect(res.status).toBe(200);
  });

  it("retries a thrown error and succeeds on the next attempt", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    fetchMock.mockRejectedValueOnce(new Error("network down")).mockResolvedValueOnce(response(200));
    const promise = fetchWithRetry(FEED_URL, { retries: 1 });
    await flushMicrotasks();
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const res = await promise;
    expect(res.status).toBe(200);
  });

  it("throws the last error when every attempt fails", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    await expect(fetchWithRetry(FEED_URL, { retries: 0 })).rejects.toThrow("network down");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("aborts the request after timeoutMs", async () => {
    fetchMock.mockImplementationOnce(
      (_input: unknown, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        })
    );
    await expect(fetchWithRetry(FEED_URL, { retries: 0, timeoutMs: 10 })).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
