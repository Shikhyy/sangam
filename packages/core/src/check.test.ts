import { describe, expect, it } from "vitest";
import { check, DEFAULT_TOLERANCE } from "./check";
import type { Target } from "./guide";

const target = (hindiShare: number, switchRate = 0.3): Target => ({
  hindiShare,
  switchRate,
  matrixLanguage: hindiShare > 0.55 ? "HI" : hindiShare < 0.45 ? "EN" : "balanced",
});

describe("check", () => {
  it("passes a reply that matches the target mix", () => {
    // aapka HI, payment EN, kal HI, due EN, hai HI -> 3 of 5 Hindi = 0.6
    const result = check("Aapka payment kal due hai", target(0.6));
    expect(result.replyProfile.hindiShare).toBeCloseTo(0.6);
    expect(result.deltaHindiShare).toBeCloseTo(0);
    expect(result.judged).toBe(true);
    expect(result.pass).toBe(true);
  });

  it("fails a reply that is far from the target", () => {
    const result = check("Your payment is due tomorrow", target(0.8));
    expect(result.replyProfile.hindiShare).toBe(0);
    expect(result.deltaHindiShare).toBeCloseTo(0.8);
    expect(result.pass).toBe(false);
  });

  it("does not judge very short replies, and passes them", () => {
    const result = check("Theek hai.", target(0.2));
    expect(result.judged).toBe(false);
    expect(result.pass).toBe(true);
  });

  it("passes an empty reply without judging it", () => {
    const result = check("", target(0.5));
    expect(result.judged).toBe(false);
    expect(result.pass).toBe(true);
  });

  it("honours a custom tolerance", () => {
    const reply = "Aapka payment kal due hai"; // 0.6
    expect(check(reply, target(0.8), { tolerance: 0.1 }).pass).toBe(false);
    expect(check(reply, target(0.8), { tolerance: 0.25 }).pass).toBe(true);
  });

  it("treats a difference of exactly the tolerance as a pass", () => {
    // 0.6 vs 0.45 is exactly 0.15 apart in decimal, but not in floating point.
    expect(check("Aapka payment kal due hai", target(0.45)).pass).toBe(true);
    expect(DEFAULT_TOLERANCE).toBe(0.15);
  });

  it("reports the CMI and switch-rate gaps", () => {
    const result = check("Aapka payment kal due hai", target(0.6, 0.3));
    // Target CMI for a 0.6 share is 40, and so is the reply's.
    expect(result.deltaCmi).toBeCloseTo(0);
    // Reply tags HI EN HI EN HI: four switches over four pairs.
    expect(result.replyProfile.switchRate).toBe(1);
    expect(result.deltaSwitchRate).toBeCloseTo(0.7);
  });

  it("says which way a failed draft drifted and how to fix it", () => {
    const tooEnglish = check("Your payment is due tomorrow", target(0.8));
    expect(tooEnglish.advice).toContain("0% Hindi");
    expect(tooEnglish.advice).toContain("80% Hindi");
    expect(tooEnglish.advice).toContain("more Hindi");

    const tooHindi = check("Aapka kal bahut kaam hai", target(0.2));
    expect(tooHindi.advice).toContain("more English");
  });

  it("gives no advice for a draft that passed or was too short to judge", () => {
    expect(check("Aapka payment kal due hai", target(0.6)).advice).toBeNull();
    expect(check("Theek hai.", target(0.2)).advice).toBeNull();
  });
});
