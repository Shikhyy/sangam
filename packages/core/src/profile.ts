import { matrixFromShare } from "./metrics";
import type { Lang, Profile, StyleType, TaggedToken } from "./types";

/** Thresholds for the playful style label. Tune here only. */
export const STYLE_THRESHOLDS = {
  mostlyHindi: 0.85,
  mostlyEnglish: 0.15,
  switcher: 0.25,
  hindiBase: 0.5,
} as const;

export const DEFAULT_DECAY = 0.6;
export const DEFAULT_MIN_TOKENS = 20;

export function styleTypeOf(hindiShare: number, switchRate: number): StyleType {
  const t = STYLE_THRESHOLDS;
  if (hindiShare >= t.mostlyHindi) return "Mostly Hindi";
  if (hindiShare <= t.mostlyEnglish) return "Mostly English";
  if (switchRate >= t.switcher) return "Mid-sentence switcher";
  return hindiShare >= t.hindiBase ? "Hindi-base, English seasoning" : "English-base, Hindi seasoning";
}

export interface ProfileOptions {
  /** Weight multiplier per step back in time. Default 0.6. */
  decay?: number;
  /** Fewer tokens than this gives `confidence: "low"`. Default 20. */
  minTokens?: number;
}

function signatureWords(utterances: readonly (readonly TaggedToken[])[], minority: Lang): string[] {
  const counts = new Map<string, { count: number; first: number }>();
  let order = 0;
  for (const utterance of utterances) {
    for (const token of utterance) {
      if (token.lang !== minority) continue;
      const word = token.text.toLowerCase();
      if (word.length < 2) continue;
      const entry = counts.get(word);
      if (entry) entry.count += 1;
      else counts.set(word, { count: 1, first: order++ });
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[1].first - b[1].first)
    .slice(0, 5)
    .map(([word]) => word);
}

/**
 * Build a speaker profile from tagged utterances, oldest first.
 * Newer utterances weigh more (exponential decay), so the profile can drift.
 * With no usable tokens it returns a balanced prior with low confidence.
 */
export function buildProfile(utterances: readonly (readonly TaggedToken[])[], options: ProfileOptions = {}): Profile {
  const { decay = DEFAULT_DECAY, minTokens = DEFAULT_MIN_TOKENS } = options;

  let wHI = 0;
  let wEN = 0;
  let wSwitches = 0;
  let wPairs = 0;
  let tokenCount = 0;

  utterances.forEach((utterance, index) => {
    const weight = decay ** (utterances.length - 1 - index);
    const counted = utterance.filter((t) => t.lang !== "X");
    let switches = 0;
    for (let i = 1; i < counted.length; i++) {
      if (counted[i]?.lang !== counted[i - 1]?.lang) switches += 1;
    }
    const hi = counted.filter((t) => t.lang === "HI").length;

    tokenCount += counted.length;
    wHI += weight * hi;
    wEN += weight * (counted.length - hi);
    wSwitches += weight * switches;
    wPairs += weight * Math.max(counted.length - 1, 0);
  });

  const wTotal = wHI + wEN;
  const hindiShare = wTotal === 0 ? 0.5 : wHI / wTotal;
  const cmi = wTotal === 0 ? 0 : 100 * (1 - Math.max(wHI, wEN) / wTotal);
  const switchRate = wPairs === 0 ? 0 : wSwitches / wPairs;
  const matrixLanguage = matrixFromShare(hindiShare, tokenCount);

  return {
    tokenCount,
    hindiShare,
    cmi,
    switchRate,
    matrixLanguage,
    styleType: styleTypeOf(hindiShare, switchRate),
    confidence: tokenCount < minTokens ? "low" : "ok",
    signatureWords: signatureWords(utterances, matrixLanguage === "EN" ? "HI" : "EN"),
  };
}
