import { describe, expect, it } from "vitest";
import { Sangam, SangamError } from "./index";

type Call = { url: string; init: RequestInit };

function fakeFetch(respond: () => Response): { fetch: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return respond();
  }) as typeof fetch;
  return { fetch: fetcher, calls };
}

const headersOf = (call: Call | undefined) => (call?.init.headers ?? {}) as Record<string, string>;

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), { headers: { "content-type": "application/json" }, ...init });

describe("Sangam client", () => {
  it("posts the utterances to /profile and returns the parsed answer", async () => {
    const { fetch, calls } = fakeFetch(() => json({ tokens: [[]], profile: { hindiShare: 0.6 } }));
    const sangam = new Sangam({ baseUrl: "https://example.test/", fetch });

    const result = await sangam.profile(["yaar meeting kal hai"], { decay: 0.5 });

    expect(result.profile.hindiShare).toBe(0.6);
    expect(calls[0]?.url).toBe("https://example.test/api/v1/profile");
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({ utterances: ["yaar meeting kal hai"], decay: 0.5 });
  });

  it("sends the key as a bearer token only when there is one", async () => {
    const withKey = fakeFetch(() => json({}));
    await new Sangam({ baseUrl: "https://x.test", apiKey: "k1", fetch: withKey.fetch }).guide({} as never);
    expect(headersOf(withKey.calls[0]).authorization).toBe("Bearer k1");

    const without = fakeFetch(() => json({}));
    await new Sangam({ baseUrl: "https://x.test", fetch: without.fetch }).guide({} as never);
    expect(headersOf(without.calls[0]).authorization).toBeUndefined();
  });

  it("posts a check with the tolerance", async () => {
    const { fetch, calls } = fakeFetch(() => json({ pass: true, advice: null }));
    const target = { hindiShare: 0.5, switchRate: 0.2, matrixLanguage: "balanced" as const };
    await new Sangam({ baseUrl: "https://x.test", fetch }).check("Aapka payment kal due hai", target, {
      tolerance: 0.1,
    });
    expect(calls[0]?.url).toBe("https://x.test/api/v1/check");
    expect(JSON.parse(String(calls[0]?.init.body)).tolerance).toBe(0.1);
  });

  it("throws a SangamError with the status, code and wait time", async () => {
    const { fetch } = fakeFetch(() =>
      json(
        { error: { code: "rate_limited", message: "Too many requests." } },
        { status: 429, headers: { "retry-after": "12" } },
      ),
    );
    const error = await new Sangam({ baseUrl: "https://x.test", fetch }).guide({} as never).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(SangamError);
    expect(error).toMatchObject({ status: 429, code: "rate_limited", retryAfter: 12, message: "Too many requests." });
  });

  it("copes with an error body that is not JSON", async () => {
    const { fetch } = fakeFetch(() => new Response("gateway down", { status: 502 }));
    const error = await new Sangam({ baseUrl: "https://x.test", fetch }).profile(["a"]).catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 502, code: "http_error", retryAfter: null });
  });
});
