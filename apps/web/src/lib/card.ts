import { buildProfile, mixMetrics, type StyleType, tag } from "@sangam/core";

export const CARD_MAX_CHARS = 200;

export interface CardFacts {
  /** False when the text has no Hindi or English words to measure. */
  hasWords: boolean;
  hindiPercent: number;
  englishPercent: number;
  /** The code-mixing index, 0 to 50, rounded. */
  mixIndex: number;
  /** Share of neighbouring words that switch language, as a percent. */
  switchPercent: number;
  words: number;
  style: StyleType | null;
}

/** Clean up text that came from a link: trim it, collapse spaces and keep it short. */
export function cleanCardText(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\s+/g, " ").trim().slice(0, CARD_MAX_CHARS);
}

/** What the card shows for a sentence. */
export function cardOf(raw: string | null | undefined): CardFacts {
  const text = cleanCardText(raw);
  const tokens = tag(text);
  const metrics = mixMetrics(tokens);
  if (metrics.n === 0) {
    return {
      hasWords: false,
      hindiPercent: 0,
      englishPercent: 0,
      mixIndex: 0,
      switchPercent: 0,
      words: 0,
      style: null,
    };
  }
  const profile = buildProfile([tokens]);
  const hindiPercent = Math.round(metrics.hindiShare * 100);
  return {
    hasWords: true,
    hindiPercent,
    englishPercent: 100 - hindiPercent,
    mixIndex: Math.round(metrics.cmi),
    switchPercent: Math.round(metrics.switchRate * 100),
    words: metrics.n,
    style: profile.styleType,
  };
}
