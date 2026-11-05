import type { MatrixLanguage, TaggedToken } from "./types";

export interface MixMetrics {
  /** Non-neutral tokens (Hindi + English). */
  n: number;
  nHI: number;
  nEN: number;
  /** nHI / n, or 0 when n is 0. */
  hindiShare: number;
  /** Code-Mixing Index: 100 x (1 - max(nHI, nEN) / n). 0 when n is 0. */
  cmi: number;
  /** Adjacent non-neutral token pairs with different languages. */
  switches: number;
  /** switches / (n - 1), or 0 when n < 2. */
  switchRate: number;
  matrixLanguage: MatrixLanguage;
}

/** Hindi share within this distance of 0.5 counts as balanced. */
export const BALANCED_BAND = 0.05;

// Floating-point slack: Math.abs(0.55 - 0.5) is 0.05000000000000004, which must still be balanced.
const EPSILON = 1e-9;

export function matrixFromShare(hindiShare: number, n: number): MatrixLanguage {
  if (n === 0 || Math.abs(hindiShare - 0.5) <= BALANCED_BAND + EPSILON) return "balanced";
  return hindiShare > 0.5 ? "HI" : "EN";
}

/** Measure how one utterance mixes Hindi and English. Neutral tokens are ignored. */
export function mixMetrics(tokens: readonly TaggedToken[]): MixMetrics {
  const counted = tokens.filter((t) => t.lang !== "X");
  const n = counted.length;
  const nHI = counted.filter((t) => t.lang === "HI").length;
  const nEN = n - nHI;

  let switches = 0;
  for (let i = 1; i < counted.length; i++) {
    if (counted[i]?.lang !== counted[i - 1]?.lang) switches += 1;
  }

  const hindiShare = n === 0 ? 0 : nHI / n;
  return {
    n,
    nHI,
    nEN,
    hindiShare,
    cmi: n === 0 ? 0 : 100 * (1 - Math.max(nHI, nEN) / n),
    switches,
    switchRate: n < 2 ? 0 : switches / (n - 1),
    matrixLanguage: matrixFromShare(hindiShare, n),
  };
}
