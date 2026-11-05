import { describe, expect, it } from "vitest";
import { matrixFromShare, mixMetrics } from "./metrics";
import type { Lang, TaggedToken } from "./types";

const toks = (...langs: Lang[]): TaggedToken[] => langs.map((lang) => ({ text: lang, lang, source: "lexicon" }));

describe("mixMetrics", () => {
  it("computes shares, CMI and switch rate", () => {
    const m = mixMetrics(toks("HI", "EN", "HI", "HI"));
    expect(m.n).toBe(4);
    expect(m.nHI).toBe(3);
    expect(m.nEN).toBe(1);
    expect(m.hindiShare).toBeCloseTo(0.75);
    expect(m.cmi).toBeCloseTo(25);
    expect(m.switches).toBe(2);
    expect(m.switchRate).toBeCloseTo(2 / 3);
    expect(m.matrixLanguage).toBe("HI");
  });

  it("gives zero mixing for a single language", () => {
    const m = mixMetrics(toks("EN", "EN", "EN"));
    expect(m.cmi).toBe(0);
    expect(m.switches).toBe(0);
    expect(m.switchRate).toBe(0);
    expect(m.matrixLanguage).toBe("EN");
  });

  it("returns zeros and a balanced matrix for no tokens", () => {
    const m = mixMetrics([]);
    expect(m).toMatchObject({ n: 0, hindiShare: 0, cmi: 0, switchRate: 0, matrixLanguage: "balanced" });
  });

  it("ignores neutral tokens, including when checking adjacency", () => {
    const m = mixMetrics(toks("HI", "X", "EN"));
    expect(m.n).toBe(2);
    expect(m.switches).toBe(1);
    expect(m.switchRate).toBe(1);
  });

  it("reaches the maximum CMI of 50 for an even mix", () => {
    expect(mixMetrics(toks("HI", "EN", "HI", "EN")).cmi).toBeCloseTo(50);
  });

  it("reports an even split as balanced", () => {
    expect(mixMetrics(toks("HI", "EN")).matrixLanguage).toBe("balanced");
  });
});

describe("matrixFromShare", () => {
  it("treats shares within 0.05 of one half as balanced", () => {
    expect(matrixFromShare(0.55, 10)).toBe("balanced");
    expect(matrixFromShare(0.45, 10)).toBe("balanced");
  });

  it("picks the majority language outside the band", () => {
    expect(matrixFromShare(0.6, 10)).toBe("HI");
    expect(matrixFromShare(0.4, 10)).toBe("EN");
  });

  it("is balanced when there is no data", () => {
    expect(matrixFromShare(0.9, 0)).toBe("balanced");
  });
});
