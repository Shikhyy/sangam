import { afterEach, describe, expect, it } from "vitest";
import { POST as checkPost } from "../app/api/v1/check/route";
import { POST as guidePost } from "../app/api/v1/guide/route";
import { POST as profilePost } from "../app/api/v1/profile/route";
import { GET as indexGet } from "../app/api/v1/route";
import { keyOf, parseCheckBody, parseGuideBody, parseProfileBody } from "./api-v1";

let caller = 0;
/** A request from its own visitor, so tests never share a rate-limit bucket. */
function post(body: unknown, headers: Record<string, string> = {}): Request {
  caller += 1;
  return new Request("http://localhost/api/v1/x", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${caller}`, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

afterEach(() => {
  delete process.env.SANGAM_API_KEYS;
});

describe("the three endpoints together", () => {
  it("measures a mix, turns it into guidance and scores a reply", async () => {
    const profileRes = await profilePost(
      post({ utterances: ["yaar meeting kal hai but mujhe time nahi pata, payment bhi due hai na"] }),
    );
    expect(profileRes.status).toBe(200);
    const { tokens, profile } = await profileRes.json();
    expect(tokens).toHaveLength(1);
    expect(profile.hindiShare).toBeGreaterThan(0.4);
    expect(profile.hindiShare).toBeLessThan(0.9);

    const guideRes = await guidePost(post({ profile, register: "neutral", outputScript: "roman" }));
    expect(guideRes.status).toBe(200);
    const guidance = await guideRes.json();
    expect(guidance.target.hindiShare).toBeGreaterThan(0);
    expect(typeof guidance.promptFragment).toBe("string");

    const checkRes = await checkPost(
      post({ reply: "Aapka payment due hai, please aaj hi kar dijiye.", target: guidance.target }),
    );
    expect(checkRes.status).toBe(200);
    const result = await checkRes.json();
    expect(result.judged).toBe(true);
    expect(typeof result.deltaHindiShare).toBe("number");
    expect(typeof result.pass).toBe("boolean");
  });

  it("describes itself at the root without a key", async () => {
    process.env.SANGAM_API_KEYS = "secret";
    const body = await indexGet().json();
    expect(body.version).toBe("v1");
    expect(body.endpoints).toHaveLength(3);
  });
});

describe("validation", () => {
  it("rejects bad profile bodies with the documented error shape", async () => {
    for (const body of [
      {},
      { utterances: [] },
      { utterances: [1] },
      { utterances: ["a".repeat(1001)] },
      { utterances: ["a"], decay: 2 },
    ]) {
      const response = await profilePost(post(body));
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error.code).toBe("invalid_request");
      expect(typeof json.error.message).toBe("string");
    }
  });

  it("rejects invalid JSON", async () => {
    const response = await profilePost(post("{not json"));
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toContain("JSON");
  });

  it("limits utterances to 10 and 5,000 characters in total", () => {
    expect(parseProfileBody({ utterances: Array(11).fill("a") }).ok).toBe(false);
    expect(parseProfileBody({ utterances: Array(6).fill("a".repeat(900)) }).ok).toBe(false);
    expect(parseProfileBody({ utterances: ["kal meeting hai"] }).ok).toBe(true);
  });

  it("checks a profile field by field", () => {
    const base = {
      tokenCount: 12,
      hindiShare: 0.6,
      cmi: 40,
      switchRate: 0.3,
      matrixLanguage: "HI",
      styleType: "Mostly Hindi",
      confidence: "ok",
      signatureWords: ["meeting"],
    };
    expect(parseGuideBody({ profile: base }).ok).toBe(true);
    expect(parseGuideBody({ profile: { ...base, hindiShare: 2 } }).ok).toBe(false);
    expect(parseGuideBody({ profile: { ...base, matrixLanguage: "FR" } }).ok).toBe(false);
    expect(parseGuideBody({ profile: base, register: "rude" }).ok).toBe(false);
    expect(parseGuideBody({ profile: base, maxSentences: 9 }).ok).toBe(false);
    expect(parseGuideBody({}).ok).toBe(false);
  });

  it("checks the reply and target", () => {
    const target = { hindiShare: 0.5, switchRate: 0.2, matrixLanguage: "balanced" };
    expect(parseCheckBody({ reply: "hello", target }).ok).toBe(true);
    expect(parseCheckBody({ reply: "", target }).ok).toBe(false);
    expect(parseCheckBody({ reply: "hello", target: { ...target, hindiShare: -1 } }).ok).toBe(false);
    expect(parseCheckBody({ reply: "hello" }).ok).toBe(false);
  });
});

describe("keys", () => {
  it("lets requests through when no keys are configured", async () => {
    const response = await profilePost(post({ utterances: ["kal meeting hai"] }));
    expect(response.status).toBe(200);
  });

  it("requires a key once keys are configured", async () => {
    process.env.SANGAM_API_KEYS = "alpha-key, beta-key";
    const missing = await profilePost(post({ utterances: ["kal meeting hai"] }));
    expect(missing.status).toBe(401);
    expect((await missing.json()).error.code).toBe("unauthorized");

    const wrong = await profilePost(post({ utterances: ["kal meeting hai"] }, { authorization: "Bearer nope" }));
    expect(wrong.status).toBe(401);
  });

  it("accepts a valid key as a Bearer token or an X-Sangam-Key header", async () => {
    process.env.SANGAM_API_KEYS = "alpha-key, beta-key";
    const bearer = await profilePost(post({ utterances: ["kal meeting hai"] }, { authorization: "Bearer beta-key" }));
    expect(bearer.status).toBe(200);
    const header = await profilePost(post({ utterances: ["kal meeting hai"] }, { "x-sangam-key": "alpha-key" }));
    expect(header.status).toBe(200);
  });

  it("never echoes the key back", async () => {
    process.env.SANGAM_API_KEYS = "alpha-key";
    const response = await profilePost(post({ utterances: ["x"] }, { authorization: "Bearer secret-wrong-key" }));
    expect(JSON.stringify(await response.json())).not.toContain("secret-wrong-key");
  });

  it("reads the key from either header", () => {
    expect(keyOf(new Request("http://x", { headers: { authorization: "Bearer abc" } }))).toBe("abc");
    expect(keyOf(new Request("http://x", { headers: { "x-sangam-key": "def" } }))).toBe("def");
    expect(keyOf(new Request("http://x"))).toBeNull();
  });
});

describe("limits", () => {
  it("refuses an oversized body", async () => {
    const response = await profilePost(post({ utterances: ["a"] }, { "content-length": "999999" }));
    expect(response.status).toBe(413);
    expect((await response.json()).error.code).toBe("too_large");
  });

  it("rate limits one visitor with a Retry-After header", async () => {
    const headers = { "x-forwarded-for": "203.0.113.9" };
    let last: Response | undefined;
    for (let i = 0; i < 61; i++) last = await profilePost(post({ utterances: ["kal"] }, headers));
    expect(last?.status).toBe(429);
    expect(last?.headers.get("retry-after")).toBe("30");
    const refusedBody = await last?.json();
    expect(refusedBody?.error.code).toBe("rate_limited");
  });
});
