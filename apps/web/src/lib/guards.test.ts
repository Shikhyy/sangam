import { describe, expect, it } from "vitest";
import {
  createReplyGuard,
  createSpeechBudget,
  DEFAULT_LIMITS,
  type Denied,
  estimateClipSeconds,
  estimateSpeechSeconds,
  type Reservation,
  readLimits,
  refusal,
} from "./guards";

const HOUR = 3_600_000;
const DAY = 86_400_000;

function clock(start = 0) {
  let time = start;
  return { now: () => time, advance: (ms: number) => (time += ms) };
}

const reserved = (result: Reservation | Denied): Reservation => {
  if (!result.ok) throw new Error(`expected a reservation, got: ${result.message}`);
  return result;
};

describe("readLimits", () => {
  it("uses the defaults when nothing is set", () => {
    expect(readLimits({})).toEqual(DEFAULT_LIMITS);
  });

  it("reads each setting", () => {
    const limits = readLimits({
      SANGAM_DAILY_SPEECH_CAP_SEC: "300",
      SANGAM_SESSION_SPEECH_CAP_SEC: "60",
      SANGAM_SPEECH_PER_MIN: "5",
      SANGAM_REPLY_PER_MIN: "4",
      SANGAM_REPLY_GLOBAL_PER_MIN: "10",
      SANGAM_REPLY_DAILY_CAP: "30",
    });
    expect(limits.speech).toEqual({ dailySeconds: 300, callerSeconds: 60, callerPerMinute: 5 });
    expect(limits.reply).toEqual({ callerPerMinute: 4, globalPerMinute: 10, dailyRequests: 30 });
  });

  it("falls back to the default for blank, negative or non-numeric values", () => {
    const limits = readLimits({
      SANGAM_DAILY_SPEECH_CAP_SEC: "  ",
      SANGAM_SESSION_SPEECH_CAP_SEC: "-5",
      SANGAM_REPLY_PER_MIN: "lots",
    });
    expect(limits.speech.dailySeconds).toBe(DEFAULT_LIMITS.speech.dailySeconds);
    expect(limits.speech.callerSeconds).toBe(DEFAULT_LIMITS.speech.callerSeconds);
    expect(limits.reply.callerPerMinute).toBe(DEFAULT_LIMITS.reply.callerPerMinute);
  });

  it("treats 0 as a real setting that blocks everything", () => {
    expect(readLimits({ SANGAM_DAILY_SPEECH_CAP_SEC: "0" }).speech.dailySeconds).toBe(0);
  });
});

describe("estimates", () => {
  it("measures a 16 kHz mono WAV from its size", () => {
    expect(estimateClipSeconds(44 + 32_000 * 3)).toBe(3);
  });

  it("never returns zero for a tiny clip or empty text", () => {
    expect(estimateClipSeconds(10)).toBeGreaterThan(0);
    expect(estimateSpeechSeconds(0)).toBeGreaterThan(0);
  });

  it("estimates speech from the number of characters", () => {
    expect(estimateSpeechSeconds(120)).toBe(10);
  });
});

describe("createSpeechBudget", () => {
  it("lets work through until the daily cap would be passed", () => {
    const { now } = clock();
    const budget = createSpeechBudget(10, 100, now);
    reserved(budget.reserve("a", 6));
    const denied = budget.reserve("b", 6);
    expect(denied.ok).toBe(false);
    expect((denied as Denied).message).toContain("today's limit");
    expect((denied as Denied).retryAfterSec).toBeGreaterThan(0);
  });

  it("caps each visitor separately", () => {
    const { now } = clock();
    const budget = createSpeechBudget(1000, 10, now);
    reserved(budget.reserve("a", 8));
    const denied = budget.reserve("a", 5);
    expect(denied.ok).toBe(false);
    expect((denied as Denied).message).toContain("this hour");
    expect(budget.reserve("b", 5).ok).toBe(true);
  });

  it("settles a reservation with the seconds actually used", () => {
    const { now } = clock();
    const budget = createSpeechBudget(100, 100, now);
    reserved(budget.reserve("a", 10)).commit(4);
    expect(budget.snapshot().usedToday).toBe(4);
  });

  it("gives a released reservation back", () => {
    const { now } = clock();
    const budget = createSpeechBudget(100, 100, now);
    reserved(budget.reserve("a", 10)).release();
    expect(budget.snapshot().usedToday).toBe(0);
  });

  it("settles only once", () => {
    const { now } = clock();
    const budget = createSpeechBudget(100, 100, now);
    const reservation = reserved(budget.reserve("a", 10));
    reservation.commit(4);
    reservation.release();
    reservation.commit(50);
    expect(budget.snapshot().usedToday).toBe(4);
  });

  it("starts a new day at midnight UTC", () => {
    const { now, advance } = clock(DAY - 1000);
    const budget = createSpeechBudget(10, 100, now);
    reserved(budget.reserve("a", 10));
    expect(budget.reserve("a", 1).ok).toBe(false);
    advance(2000);
    expect(budget.reserve("a", 1).ok).toBe(true);
  });

  it("gives a visitor a fresh allowance each hour", () => {
    const { now, advance } = clock();
    const budget = createSpeechBudget(1000, 10, now);
    reserved(budget.reserve("a", 10));
    expect(budget.reserve("a", 1).ok).toBe(false);
    advance(HOUR + 1);
    expect(budget.reserve("a", 5).ok).toBe(true);
  });

  it("blocks everything when the cap is 0", () => {
    const { now } = clock();
    expect(createSpeechBudget(0, 100, now).reserve("a", 1).ok).toBe(false);
  });
});

describe("createReplyGuard", () => {
  const limits = { callerPerMinute: 3, globalPerMinute: 5, dailyRequests: 6 };

  it("allows requests up to the per-visitor limit, then asks to wait", () => {
    const { now } = clock();
    const guard = createReplyGuard(limits, now);
    expect([guard.take("a"), guard.take("a"), guard.take("a")]).toEqual([null, null, null]);
    expect(guard.take("a")?.message).toContain("a minute");
  });

  it("limits the whole site per minute", () => {
    const { now } = clock();
    const guard = createReplyGuard({ ...limits, callerPerMinute: 10 }, now);
    for (const caller of ["a", "b", "c", "d", "e"]) expect(guard.take(caller)).toBeNull();
    expect(guard.take("f")?.message).toContain("Lots of people");
  });

  it("stops at the daily cap and says when it resets", () => {
    const { now, advance } = clock();
    const guard = createReplyGuard({ callerPerMinute: 100, globalPerMinute: 100, dailyRequests: 2 }, now);
    expect(guard.take("a")).toBeNull();
    expect(guard.take("a")).toBeNull();
    const denied = guard.take("a");
    expect(denied?.message).toContain("today's limit");
    expect(denied?.retryAfterSec).toBeGreaterThan(0);
    advance(DAY);
    expect(guard.take("a")).toBeNull();
  });

  it("lets the minute pass and allows requests again", () => {
    const { now, advance } = clock();
    const guard = createReplyGuard(limits, now);
    for (let i = 0; i < 3; i++) guard.take("a");
    expect(guard.take("a")).not.toBeNull();
    advance(60_001);
    expect(guard.take("a")).toBeNull();
  });

  it("blocks everything when the daily cap is 0", () => {
    const { now } = clock();
    expect(createReplyGuard({ ...limits, dailyRequests: 0 }, now).take("a")).not.toBeNull();
  });
});

describe("refusal", () => {
  it("is a 429 with a Retry-After header and a message", async () => {
    const response = refusal({ ok: false, message: "Slow down.", retryAfterSec: 42 });
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
    expect(await response.json()).toEqual({ error: "Slow down.", retryAfterSec: 42 });
  });
});
