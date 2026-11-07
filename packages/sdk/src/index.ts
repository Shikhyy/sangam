import type { CheckResult, Guidance, OutputScript, Profile, Register, TaggedToken, Target } from "@sangam/core";

export type { CheckResult, Guidance, OutputScript, Profile, Register, TaggedToken, Target };

export interface SangamOptions {
  /** Where the API lives, for example "https://sangam-voice.vercel.app". No trailing path. */
  baseUrl: string;
  /** Sent as a bearer token. Only needed when the server runs with keys switched on. */
  apiKey?: string;
  /** A replacement for fetch, for tests or older runtimes. */
  fetch?: typeof fetch;
}

/** The server said no. `status` is the HTTP status and `code` is the API's error code, such as "rate_limited". */
export class SangamError extends Error {
  readonly status: number;
  readonly code: string;
  /** Seconds to wait before trying again, when the server said so. */
  readonly retryAfter: number | null;

  constructor(message: string, status: number, code: string, retryAfter: number | null = null) {
    super(message);
    this.name = "SangamError";
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

export interface ProfileResult {
  tokens: TaggedToken[][];
  profile: Profile;
}

export interface GuideInput {
  profile: Profile;
  register?: Register;
  outputScript?: OutputScript;
  recentUserWords?: string[];
  maxSentences?: number;
}

/**
 * A client for the three Sangam endpoints.
 *
 *   const sangam = new Sangam({ baseUrl: "https://sangam-voice.vercel.app" });
 *   const { profile } = await sangam.profile(["yaar meeting kal hai but mujhe time nahi pata"]);
 *   const guidance = await sangam.guide({ profile });
 *   // put guidance.promptFragment in your model's prompt, then:
 *   const result = await sangam.check(reply, guidance.target);
 *   if (result.advice) { // ask for a closer rewrite with result.advice }
 */
export class Sangam {
  private readonly base: string;
  private readonly apiKey: string | undefined;
  private readonly doFetch: typeof fetch;

  constructor({ baseUrl, apiKey, fetch: custom }: SangamOptions) {
    this.base = baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey;
    this.doFetch = custom ?? ((input, init) => fetch(input, init));
  }

  /** Measure how someone mixes the two languages. Utterances are oldest first; newer ones weigh more. */
  profile(utterances: string[], options: { decay?: number } = {}): Promise<ProfileResult> {
    return this.post("/api/v1/profile", { utterances, ...options });
  }

  /** Turn a profile into a target mix and plain-language instructions for your model. */
  guide(input: GuideInput): Promise<Guidance> {
    return this.post("/api/v1/guide", input);
  }

  /** Score a draft reply against a target. When it misses, `advice` says how to fix it. */
  check(reply: string, target: Target, options: { tolerance?: number } = {}): Promise<CheckResult> {
    return this.post("/api/v1/check", { reply, target, ...options });
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await this.doFetch(`${this.base}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let message = `Request failed with status ${response.status}.`;
      let code = "http_error";
      try {
        const data = (await response.json()) as { error?: { code?: string; message?: string } | string };
        if (typeof data.error === "object" && data.error) {
          message = data.error.message ?? message;
          code = data.error.code ?? code;
        } else if (typeof data.error === "string") {
          message = data.error;
        }
      } catch {
        // The body was not JSON; keep the generic message.
      }
      const wait = Number(response.headers.get("retry-after"));
      throw new SangamError(message, response.status, code, Number.isFinite(wait) && wait > 0 ? wait : null);
    }
    return (await response.json()) as T;
  }
}
