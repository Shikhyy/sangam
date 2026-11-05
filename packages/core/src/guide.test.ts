import { describe, expect, it } from "vitest";
import { guide, PRIOR_TARGET, REGISTER_LIMITS, SHARE_CLAMP } from "./guide";
import type { MatrixLanguage, Profile } from "./types";

const profile = (over: Partial<Profile> = {}): Profile => ({
  tokenCount: 40,
  hindiShare: 0.7,
  cmi: 30,
  switchRate: 0.3,
  matrixLanguage: "HI" as MatrixLanguage,
  styleType: "Mid-sentence switcher",
  confidence: "ok",
  signatureWords: ["meeting", "payment"],
  ...over,
});

describe("guide: target", () => {
  it("mirrors the user's Hindi share when confidence is ok", () => {
    const g = guide({ profile: profile({ hindiShare: 0.7 }) });
    expect(g.target.hindiShare).toBeCloseTo(0.7);
    expect(g.target.matrixLanguage).toBe("HI");
    expect(g.usedPrior).toBe(false);
  });

  it("falls back to a balanced prior when confidence is low", () => {
    const g = guide({ profile: profile({ confidence: "low", hindiShare: 0.95 }) });
    expect(g.usedPrior).toBe(true);
    expect(g.target.hindiShare).toBe(PRIOR_TARGET.hindiShare);
    expect(g.target.matrixLanguage).toBe("balanced");
    expect(g.promptFragment).toContain("not enough data");
  });

  it("never goes fully one-language", () => {
    expect(guide({ profile: profile({ hindiShare: 0.99 }) }).target.hindiShare).toBe(SHARE_CLAMP.max);
    expect(guide({ profile: profile({ hindiShare: 0.01 }) }).target.hindiShare).toBe(SHARE_CLAMP.min);
  });

  it("caps mid-sentence switching by register", () => {
    const p = profile({ switchRate: 0.5 });
    expect(guide({ profile: p, register: "formal" }).target.switchRate).toBe(REGISTER_LIMITS.formal.maxSwitchRate);
    expect(guide({ profile: p, register: "neutral" }).target.switchRate).toBe(REGISTER_LIMITS.neutral.maxSwitchRate);
    expect(guide({ profile: p, register: "casual" }).target.switchRate).toBe(0.5);
  });

  it("applies the register cap to the prior too", () => {
    const g = guide({ profile: profile({ confidence: "low" }), register: "formal" });
    expect(g.target.switchRate).toBe(Math.min(PRIOR_TARGET.switchRate, REGISTER_LIMITS.formal.maxSwitchRate));
  });
});

describe("guide: prompt fragment", () => {
  it("states the target percentages", () => {
    const g = guide({ profile: profile({ hindiShare: 0.7 }) });
    expect(g.promptFragment).toContain("about 70% Hindi and 30% English");
  });

  it("asks for Roman script by default and Devanagari on request", () => {
    expect(guide({ profile: profile() }).promptFragment).toContain("Roman script");
    expect(guide({ profile: profile(), outputScript: "devanagari" }).promptFragment).toContain("Devanagari script");
  });

  it("describes switching behaviour from the switch rate", () => {
    expect(guide({ profile: profile({ switchRate: 0.05 }) }).promptFragment).toContain("between sentences");
    expect(guide({ profile: profile({ switchRate: 0.2 }) }).promptFragment).toContain("occasionally");
    expect(guide({ profile: profile({ switchRate: 0.5 }), register: "casual" }).promptFragment).toContain("freely");
  });

  it("limits reply length for speech", () => {
    expect(guide({ profile: profile() }).promptFragment).toContain("at most 2 short sentences");
    expect(guide({ profile: profile(), maxSentences: 1 }).promptFragment).toContain("at most 1 short sentence,");
  });

  it("adapts the tone to the register", () => {
    expect(guide({ profile: profile(), register: "formal" }).promptFragment).toContain("formal");
    expect(guide({ profile: profile(), register: "casual" }).promptFragment).toContain("casual");
  });
});

describe("guide: borrowed words", () => {
  it("keeps the user's English words in English", () => {
    const g = guide({ profile: profile({ signatureWords: ["meeting"] }), recentUserWords: ["payment"] });
    expect(g.borrowedWords).toEqual(["meeting", "payment"]);
    expect(g.promptFragment).toContain("keep them in English: meeting, payment");
  });

  it("lists the user's Hindi words separately", () => {
    const g = guide({ profile: profile({ signatureWords: [] }), recentUserWords: ["matlab"] });
    expect(g.promptFragment).toContain("reuse them sparingly: matlab");
  });

  it("drops slang unless the register is casual", () => {
    const base = { profile: profile({ signatureWords: [] }), recentUserWords: ["yaar", "kal"] };
    expect(guide({ ...base, register: "neutral" }).borrowedWords).toEqual(["kal"]);
    expect(guide({ ...base, register: "casual" }).borrowedWords).toEqual(["yaar", "kal"]);
  });

  it("removes duplicates and ignores names and numbers", () => {
    const g = guide({
      profile: profile({ signatureWords: ["meeting"] }),
      recentUserWords: ["Meeting", "5000", "Rahul"],
    });
    expect(g.borrowedWords).toEqual(["meeting"]);
  });

  it("returns at most eight words", () => {
    const words = ["alpha", "bank", "card", "loan", "order", "phone", "ticket", "bill", "money", "office"];
    const g = guide({ profile: profile({ signatureWords: [] }), recentUserWords: words });
    expect(g.borrowedWords).toHaveLength(8);
  });
});

describe("guide: avoid", () => {
  it("avoids Devanagari for Roman output and slang outside casual register", () => {
    const g = guide({ profile: profile(), register: "neutral" });
    expect(g.avoid).toEqual(["Devanagari script", "copying the user's slang (yaar, bhai, bro)"]);
  });

  it("has nothing to avoid for casual Devanagari output", () => {
    expect(guide({ profile: profile(), register: "casual", outputScript: "devanagari" }).avoid).toEqual([]);
  });
});
