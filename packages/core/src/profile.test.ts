import { describe, expect, it } from "vitest";
import { buildProfile, styleTypeOf } from "./profile";
import { tag } from "./tagger";
import type { Lang, TaggedToken } from "./types";

const run = (lang: Lang, count: number): TaggedToken[] =>
  Array.from({ length: count }, (_, i) => ({ text: `${lang.toLowerCase()}${i}`, lang, source: "lexicon" as const }));

describe("styleTypeOf", () => {
  it("labels mostly-one-language speech", () => {
    expect(styleTypeOf(0.9, 0)).toBe("Mostly Hindi");
    expect(styleTypeOf(0.1, 0.3)).toBe("Mostly English");
  });

  it("uses the thresholds inclusively", () => {
    expect(styleTypeOf(0.85, 0)).toBe("Mostly Hindi");
    expect(styleTypeOf(0.15, 0)).toBe("Mostly English");
    expect(styleTypeOf(0.6, 0.25)).toBe("Mid-sentence switcher");
  });

  it("separates the two base-language mixes when switching is low", () => {
    expect(styleTypeOf(0.6, 0.1)).toBe("Hindi-base, English seasoning");
    expect(styleTypeOf(0.5, 0.1)).toBe("Hindi-base, English seasoning");
    expect(styleTypeOf(0.4, 0.1)).toBe("English-base, Hindi seasoning");
  });
});

describe("buildProfile", () => {
  it("returns a balanced, low-confidence prior with no data", () => {
    const p = buildProfile([]);
    expect(p).toMatchObject({
      tokenCount: 0,
      hindiShare: 0.5,
      cmi: 0,
      switchRate: 0,
      matrixLanguage: "balanced",
      confidence: "low",
      signatureWords: [],
    });
  });

  it("is low confidence below 20 tokens and ok at 20", () => {
    expect(buildProfile([run("HI", 19)]).confidence).toBe("low");
    expect(buildProfile([run("HI", 20)]).confidence).toBe("ok");
  });

  it("lets newer utterances weigh more", () => {
    // Old: 10 Hindi tokens (weight 0.6). New: 10 English tokens (weight 1).
    const p = buildProfile([run("HI", 10), run("EN", 10)], { decay: 0.6 });
    expect(p.hindiShare).toBeCloseTo(6 / 16);
    expect(p.matrixLanguage).toBe("EN");
  });

  it("counts switches within an utterance only", () => {
    // Each utterance is single-language, so there are no switches even though they differ.
    const p = buildProfile([run("HI", 5), run("EN", 5)]);
    expect(p.switchRate).toBe(0);
  });

  it("measures switching inside an utterance", () => {
    const mixed: TaggedToken[] = ["HI", "EN", "HI", "EN", "HI"].map((lang, i) => ({
      text: `w${i}`,
      lang: lang as Lang,
      source: "lexicon",
    }));
    expect(buildProfile([mixed]).switchRate).toBe(1);
  });

  it("ignores neutral tokens in the counts", () => {
    const withNeutral: TaggedToken[] = [...run("X", 5), ...run("HI", 3)];
    expect(buildProfile([withNeutral]).tokenCount).toBe(3);
  });

  it("lists the speaker's minority-language words by frequency", () => {
    const utterance = tag("kal meeting hai aur payment bhi meeting ke baad");
    const p = buildProfile([utterance]);
    expect(p.matrixLanguage).toBe("HI");
    expect(p.signatureWords).toEqual(["meeting", "payment"]);
  });

  it("lists Hindi words when English is the matrix language", () => {
    const utterance = tag("I will check the meeting time yaar and then call you yaar");
    const p = buildProfile([utterance]);
    expect(p.matrixLanguage).toBe("EN");
    expect(p.signatureWords).toContain("yaar");
  });
});
