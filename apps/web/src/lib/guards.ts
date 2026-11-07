import { createRateLimiter } from "./rate-limit";

/**
 * Limits that keep the app from overspending or hitting a provider's rate limit.
 *
 * Speech (Gnani) costs credits per second, so it has a daily cap for the whole site and an hourly cap
 * for each visitor. The free language models allow only a few requests a minute and a few dozen a day,
 * so replies have a per-visitor and a site-wide rate limit and a daily cap that stays under the free quota.
 * Counters live in memory for one server process: a safety net, not billing.
 */
export interface Limits {
  speech: {
    /** Seconds of speech the whole site may use per UTC day. */
    dailySeconds: number;
    /** Seconds one visitor may use per hour. */
    callerSeconds: number;
    /** Speech requests one visitor may make per minute. */
    callerPerMinute: number;
  };
  api: {
    /** Public API requests one key (or one visitor without a key) may make per minute. */
    perMinute: number;
  };
  reply: {
    /** Reply requests one visitor may make per minute. Each "Get replies" makes two. */
    callerPerMinute: number;
    /** Reply requests the whole site may make per minute. */
    globalPerMinute: number;
    /** Reply requests the whole site may make per UTC day. */
    dailyRequests: number;
  };
}

export const DEFAULT_LIMITS: Limits = {
  speech: { dailySeconds: 900, callerSeconds: 120, callerPerMinute: 20 },
  api: { perMinute: 60 },
  // OpenRouter's free models allow about 20 requests a minute and 50 a day without credits.
  reply: { callerPerMinute: 12, globalPerMinute: 18, dailyRequests: 45 },
};

/** A non-negative number from a setting, or the default when it is blank or not a number. 0 blocks. */
function numberFrom(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/** Read the limits from environment settings (pass `process.env`). */
export function readLimits(env: Readonly<Record<string, string | undefined>>): Limits {
  return {
    speech: {
      dailySeconds: numberFrom(env.SANGAM_DAILY_SPEECH_CAP_SEC, DEFAULT_LIMITS.speech.dailySeconds),
      callerSeconds: numberFrom(env.SANGAM_SESSION_SPEECH_CAP_SEC, DEFAULT_LIMITS.speech.callerSeconds),
      callerPerMinute: numberFrom(env.SANGAM_SPEECH_PER_MIN, DEFAULT_LIMITS.speech.callerPerMinute),
    },
    api: { perMinute: numberFrom(env.SANGAM_API_PER_MIN, DEFAULT_LIMITS.api.perMinute) },
    reply: {
      callerPerMinute: numberFrom(env.SANGAM_REPLY_PER_MIN, DEFAULT_LIMITS.reply.callerPerMinute),
      globalPerMinute: numberFrom(env.SANGAM_REPLY_GLOBAL_PER_MIN, DEFAULT_LIMITS.reply.globalPerMinute),
      dailyRequests: numberFrom(env.SANGAM_REPLY_DAILY_CAP, DEFAULT_LIMITS.reply.dailyRequests),
    },
  };
}

export interface Denied {
  ok: false;
  message: string;
  /** How long to wait before trying again, in seconds. */
  retryAfterSec: number;
}

export interface Reservation {
  ok: true;
  /** Settle the reservation with the seconds actually used. */
  commit(actualSeconds: number): void;
  /** Give the reservation back, because the work did not happen. */
  release(): void;
}

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

const dayOf = (time: number) => Math.floor(time / DAY_MS);
const secondsToMidnight = (time: number) => Math.max(1, Math.ceil((DAY_MS - (time % DAY_MS)) / 1000));

/** Audio is 24 kHz, 16-bit, mono WAV from Gnani: 48,000 bytes per second. */
export const SPOKEN_BYTES_PER_SECOND = 48_000;

/** About how long a clip is, from its size. Browser recordings are 16 kHz, 16-bit mono WAV. */
export function estimateClipSeconds(bytes: number): number {
  return Math.max(0.1, (bytes - 44) / 32_000);
}

/** About how long some text takes to say: roughly 12 characters a second. */
export function estimateSpeechSeconds(characters: number): number {
  return Math.max(0.5, characters / 12);
}

/** Tracks speech seconds for the site per day and for each visitor per hour. */
export function createSpeechBudget(dailySeconds: number, callerSeconds: number, now: () => number = Date.now) {
  let day = dayOf(now());
  let used = 0;
  const callers = new Map<string, { start: number; used: number }>();

  const roll = () => {
    const today = dayOf(now());
    if (today !== day) {
      day = today;
      used = 0;
    }
  };

  const stateOf = (caller: string) => {
    const time = now();
    const existing = callers.get(caller);
    if (existing && time - existing.start < HOUR_MS) return existing;
    const fresh = { start: time, used: 0 };
    callers.set(caller, fresh);
    if (callers.size > 1000) {
      for (const [key, state] of callers) if (time - state.start >= HOUR_MS) callers.delete(key);
    }
    return fresh;
  };

  return {
    /** Set seconds aside before doing the work. Refused when either cap would be passed. */
    reserve(caller: string, seconds: number): Reservation | Denied {
      roll();
      const state = stateOf(caller);
      if (used + seconds > dailySeconds) {
        return {
          ok: false,
          message: "Speech has reached today's limit. It resets at midnight UTC. You can still type.",
          retryAfterSec: secondsToMidnight(now()),
        };
      }
      if (state.used + seconds > callerSeconds) {
        return {
          ok: false,
          message: "You've used your speech allowance for this hour. Try again later, or type instead.",
          retryAfterSec: Math.max(1, Math.ceil((HOUR_MS - (now() - state.start)) / 1000)),
        };
      }

      used += seconds;
      state.used += seconds;
      let settled = false;
      const settle = (actual: number) => {
        if (settled) return;
        settled = true;
        roll();
        const delta = actual - seconds;
        used = Math.max(0, used + delta);
        state.used = Math.max(0, state.used + delta);
      };
      return { ok: true, commit: (actual) => settle(actual), release: () => settle(0) };
    },

    /** Seconds used today and left today, for logs and tests. */
    snapshot() {
      roll();
      return { usedToday: used, leftToday: Math.max(0, dailySeconds - used) };
    },
  };
}

/** Rate limits and a daily cap for reply requests to the language model. */
export function createReplyGuard(limits: Limits["reply"], now: () => number = Date.now) {
  const perCaller = createRateLimiter(limits.callerPerMinute, 60_000);
  const sitewide = createRateLimiter(limits.globalPerMinute, 60_000);
  let day = dayOf(now());
  let today = 0;

  return {
    /** Count one reply request. Returns null when it may go ahead. */
    take(caller: string): Denied | null {
      const time = now();
      if (dayOf(time) !== day) {
        day = dayOf(time);
        today = 0;
      }
      if (today >= limits.dailyRequests) {
        return {
          ok: false,
          message: "Replies have reached today's limit. It resets at midnight UTC.",
          retryAfterSec: secondsToMidnight(time),
        };
      }
      if (!sitewide("site", time)) {
        return {
          ok: false,
          message: "Lots of people are trying this. Wait a moment and try again.",
          retryAfterSec: 30,
        };
      }
      if (!perCaller(caller, time)) {
        return { ok: false, message: "That's a lot of replies in a minute. Wait a moment.", retryAfterSec: 30 };
      }
      today += 1;
      return null;
    },
  };
}

export type Guards = ReturnType<typeof createGuards>;

export function createGuards(limits: Limits, now: () => number = Date.now) {
  return {
    limits,
    speech: {
      budget: createSpeechBudget(limits.speech.dailySeconds, limits.speech.callerSeconds, now),
      perMinute: createRateLimiter(limits.speech.callerPerMinute, 60_000),
    },
    api: createRateLimiter(limits.api.perMinute, 60_000),
    reply: createReplyGuard(limits.reply, now),
  };
}

const store = globalThis as typeof globalThis & { __sangamGuards?: Guards };

/** The shared guards for this server process. Kept on globalThis so a dev reload does not reset them. */
export function getGuards(env: Readonly<Record<string, string | undefined>> = process.env): Guards {
  store.__sangamGuards ??= createGuards(readLimits(env));
  return store.__sangamGuards;
}

/** A response for a refused request: 429 with a Retry-After header and a message for the person. */
export function refusal(denied: Denied): Response {
  return Response.json(
    { error: denied.message, retryAfterSec: denied.retryAfterSec },
    { status: 429, headers: { "retry-after": String(denied.retryAfterSec), "cache-control": "no-store" } },
  );
}
