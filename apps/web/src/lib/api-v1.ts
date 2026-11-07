import { createHash, timingSafeEqual } from "node:crypto";
import type { MatrixLanguage, OutputScript, Profile, Register, StyleType, Target } from "@sangam/core";
import { getGuards } from "./guards";
import { callerOf } from "./rate-limit";

/** The public API's error body: { error: { code, message } }, as written in docs/API.md. */
export function apiError(code: string, message: string, status: number, headers?: HeadersInit): Response {
  return Response.json({ error: { code, message } }, { status, headers: { "cache-control": "no-store", ...headers } });
}

const MAX_BODY_BYTES = 20_000;

const hash = (value: string) => createHash("sha256").update(value).digest();

/** Keys from SANGAM_API_KEYS (comma separated). Blank means the API is open, which is for the demo and local use. */
function configuredKeys(env: Readonly<Record<string, string | undefined>>): Buffer[] {
  return (env.SANGAM_API_KEYS ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean)
    .map(hash);
}

/** The key a request sent, as Authorization: Bearer <key> or X-Sangam-Key. */
export function keyOf(request: Request): string | null {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  return (bearer ?? request.headers.get("x-sangam-key"))?.trim() || null;
}

/**
 * Check a public API request before doing any work: the key (when keys are configured), the body size
 * and the rate limit. Returns a refusal to send back, or null when the request may go ahead.
 */
export function gate(
  request: Request,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Response | null {
  const keys = configuredKeys(env);
  const sent = keyOf(request);

  if (keys.length > 0) {
    if (!sent) return apiError("unauthorized", "Send your API key as Authorization: Bearer <key>.", 401);
    const candidate = hash(sent);
    if (!keys.some((key) => timingSafeEqual(key, candidate))) {
      return apiError("unauthorized", "That API key is not valid.", 401);
    }
  }

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return apiError("too_large", `The body must be under ${MAX_BODY_BYTES} bytes.`, 413);

  // One bucket per key, or per visitor when the API is open. Keys are hashed so they never sit in memory as text.
  const bucket = keys.length > 0 && sent ? `key:${hash(sent).toString("hex").slice(0, 16)}` : `ip:${callerOf(request)}`;
  if (!getGuards(env).api(bucket)) {
    return apiError("rate_limited", "Too many requests. Wait a moment and try again.", 429, { "retry-after": "30" });
  }
  return null;
}

type Parsed<T> = { ok: true; value: T } | { ok: false; message: string };
const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNumberIn = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

const REGISTERS: readonly Register[] = ["formal", "neutral", "casual"];
const SCRIPTS: readonly OutputScript[] = ["roman", "devanagari"];
const MATRICES: readonly MatrixLanguage[] = ["HI", "EN", "balanced"];
const STYLES: readonly StyleType[] = [
  "Mostly Hindi",
  "Mostly English",
  "Mid-sentence switcher",
  "Hindi-base, English seasoning",
  "English-base, Hindi seasoning",
];

export function parseProfileBody(body: unknown): Parsed<{ utterances: string[]; decay?: number }> {
  if (!isObject(body)) return fail("The body must be a JSON object.");
  const { utterances, decay } = body;
  if (!Array.isArray(utterances) || utterances.length < 1 || utterances.length > 10) {
    return fail("utterances must contain 1 to 10 strings.");
  }
  let total = 0;
  for (const item of utterances) {
    if (typeof item !== "string") return fail("utterances must contain 1 to 10 strings.");
    if (item.length > 1000) return fail("Each utterance must be at most 1,000 characters.");
    total += item.length;
  }
  if (total > 5000) return fail("The utterances must total at most 5,000 characters.");
  if (decay !== undefined && !isNumberIn(decay, 0, 1)) return fail("decay must be a number from 0 to 1.");
  return { ok: true, value: { utterances: utterances as string[], decay: decay as number | undefined } };
}

function parseProfile(value: unknown): Parsed<Profile> {
  if (!isObject(value)) return fail("profile must be the object returned by /profile.");
  const { tokenCount, hindiShare, cmi, switchRate, matrixLanguage, styleType, confidence, signatureWords } = value;
  if (typeof tokenCount !== "number" || !Number.isInteger(tokenCount) || tokenCount < 0 || tokenCount > 100_000) {
    return fail("profile.tokenCount must be a whole number.");
  }
  if (!isNumberIn(hindiShare, 0, 1)) return fail("profile.hindiShare must be a number from 0 to 1.");
  if (!isNumberIn(cmi, 0, 100)) return fail("profile.cmi must be a number from 0 to 100.");
  if (!isNumberIn(switchRate, 0, 1)) return fail("profile.switchRate must be a number from 0 to 1.");
  if (!MATRICES.includes(matrixLanguage as MatrixLanguage))
    return fail("profile.matrixLanguage must be HI, EN or balanced.");
  if (!STYLES.includes(styleType as StyleType)) return fail("profile.styleType is not a known style.");
  if (confidence !== "low" && confidence !== "ok") return fail('profile.confidence must be "low" or "ok".');
  if (
    !Array.isArray(signatureWords) ||
    signatureWords.length > 5 ||
    signatureWords.some((word) => typeof word !== "string" || word.length > 40)
  ) {
    return fail("profile.signatureWords must be up to 5 short strings.");
  }
  return {
    ok: true,
    value: {
      tokenCount,
      hindiShare,
      cmi,
      switchRate,
      matrixLanguage: matrixLanguage as MatrixLanguage,
      styleType: styleType as StyleType,
      confidence,
      signatureWords: signatureWords as string[],
    },
  };
}

export function parseGuideBody(body: unknown): Parsed<{
  profile: Profile;
  register: Register;
  outputScript: OutputScript;
  recentUserWords: string[];
  maxSentences: number;
}> {
  if (!isObject(body)) return fail("The body must be a JSON object.");
  const profile = parseProfile(body.profile);
  if (!profile.ok) return profile;

  const register = body.register ?? "neutral";
  if (!REGISTERS.includes(register as Register)) return fail("register must be formal, neutral or casual.");
  const outputScript = body.outputScript ?? "roman";
  if (!SCRIPTS.includes(outputScript as OutputScript)) return fail("outputScript must be roman or devanagari.");

  const words = body.recentUserWords ?? [];
  if (!Array.isArray(words) || words.length > 50 || words.some((w) => typeof w !== "string" || w.length > 40)) {
    return fail("recentUserWords must be up to 50 short strings.");
  }
  const maxSentences = body.maxSentences ?? 2;
  if (typeof maxSentences !== "number" || !Number.isInteger(maxSentences) || maxSentences < 1 || maxSentences > 3) {
    return fail("maxSentences must be 1, 2 or 3.");
  }
  return {
    ok: true,
    value: {
      profile: profile.value,
      register: register as Register,
      outputScript: outputScript as OutputScript,
      recentUserWords: words as string[],
      maxSentences,
    },
  };
}

export function parseCheckBody(body: unknown): Parsed<{ reply: string; target: Target; tolerance?: number }> {
  if (!isObject(body)) return fail("The body must be a JSON object.");
  const { reply, target, tolerance } = body;
  if (typeof reply !== "string" || reply.trim() === "" || reply.length > 1000) {
    return fail("reply must be a string of 1 to 1,000 characters.");
  }
  if (!isObject(target)) return fail("target must be the target returned by /guide.");
  if (!isNumberIn(target.hindiShare, 0, 1)) return fail("target.hindiShare must be a number from 0 to 1.");
  if (!isNumberIn(target.switchRate, 0, 1)) return fail("target.switchRate must be a number from 0 to 1.");
  if (!MATRICES.includes(target.matrixLanguage as MatrixLanguage)) {
    return fail("target.matrixLanguage must be HI, EN or balanced.");
  }
  if (tolerance !== undefined && !isNumberIn(tolerance, 0, 1)) return fail("tolerance must be a number from 0 to 1.");
  return {
    ok: true,
    value: {
      reply,
      target: {
        hindiShare: target.hindiShare,
        switchRate: target.switchRate,
        matrixLanguage: target.matrixLanguage as MatrixLanguage,
      },
      tolerance: tolerance as number | undefined,
    },
  };
}

/** Read a JSON body, or return the 400 to send back. */
export async function readJson(
  request: Request,
): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> {
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return { ok: false, response: apiError("invalid_request", "The body must be valid JSON.", 400) };
  }
}
