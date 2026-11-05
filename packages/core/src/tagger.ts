import { AMBIGUOUS, DEVANAGARI_LOAN_EN, EN_COMMON, HI_ROMAN, NAMES, NEUTRAL } from "./lexicon/index";
import { type RawToken, tokenize } from "./tokenize";
import type { Lang, TaggedToken, TagSource } from "./types";

export interface TagOptions {
  /**
   * What to do with Latin words that no list recognises.
   * "en" (default): guess English and mark the token uncertain. "x": ignore them.
   */
  unknownPolicy?: "en" | "x";
}

type Pending = Lang | "AMB" | "UNK";

interface Decision {
  lang: Pending;
  source: TagSource;
  /** For "AMB": the language to use when neighbours cannot decide. */
  fallback?: "HI" | "EN";
}

/** Does `word` look like a regular inflection of a known English word? (meetings, calling, called) */
function englishByStem(word: string): boolean {
  if (word.length < 4) return false;
  const tries: string[] = [];
  const doubled = (s: string) => (s.length >= 2 && s.at(-1) === s.at(-2) ? s.slice(0, -1) : s);

  if (word.endsWith("ing")) {
    const stem = word.slice(0, -3);
    tries.push(stem, `${stem}e`, doubled(stem));
  }
  if (word.endsWith("ed")) {
    const stem = word.slice(0, -2);
    tries.push(stem, `${stem}e`, doubled(stem), word.slice(0, -1));
  }
  if (word.endsWith("es")) tries.push(word.slice(0, -2));
  if (word.endsWith("s")) tries.push(word.slice(0, -1));
  if (word.endsWith("ly")) tries.push(word.slice(0, -2));
  if (word.endsWith("er")) tries.push(word.slice(0, -2), word.slice(0, -1));

  return tries.some((stem) => stem.length >= 3 && EN_COMMON.has(stem));
}

const isEnglish = (word: string): boolean => EN_COMMON.has(word) || englishByStem(word);

/** First pass: decide everything that does not depend on neighbours. */
function classify(token: RawToken): Decision {
  if (token.hasDigit) return { lang: "X", source: "rule" };

  if (token.script === "devanagari") {
    if (NEUTRAL.has(token.norm)) return { lang: "X", source: "lexicon" };
    if (DEVANAGARI_LOAN_EN.has(token.norm)) return { lang: "EN", source: "lexicon" };
    return { lang: "HI", source: "script" };
  }

  if (token.script !== "latin") return { lang: "X", source: "rule" };

  // Contractions (don't, I'm) are English.
  if (token.norm.includes("'")) return { lang: "EN", source: "rule" };

  for (const word of token.candidates) {
    if (NEUTRAL.has(word)) return { lang: "X", source: "lexicon" };
    const fallback = AMBIGUOUS.get(word);
    if (fallback) return { lang: "AMB", source: "context", fallback };
    if (HI_ROMAN.has(word)) return { lang: "HI", source: "lexicon" };
    if (isEnglish(word)) return { lang: "EN", source: "lexicon" };
  }

  if (NAMES.has(token.norm)) return { lang: "X", source: "lexicon" };
  // An unknown capitalised word mid-sentence is most likely a name.
  if (!token.sentenceInitial && token.capitalized) return { lang: "X", source: "rule" };

  return { lang: "UNK", source: "rule" };
}

function nearestDefinite(decided: readonly Pending[], from: number, step: 1 | -1): "HI" | "EN" | null {
  for (let i = from + step; i >= 0 && i < decided.length; i += step) {
    const lang = decided[i];
    if (lang === "HI" || lang === "EN") return lang;
  }
  return null;
}

/**
 * Tag every word in `text` as Hindi (HI), English (EN) or neutral (X).
 *
 * Order of evidence: numbers, script (Devanagari), neutral words, ambiguous words
 * (decided by their nearest Hindi/English neighbours), the Hindi list, the English
 * list, names, then a default for unknown words.
 */
export function tag(text: string, options: TagOptions = {}): TaggedToken[] {
  const { unknownPolicy = "en" } = options;
  const tokens = tokenize(text);
  const decisions = tokens.map(classify);
  const decided = decisions.map((d) => d.lang);

  return tokens.map((token, i): TaggedToken => {
    const decision = decisions[i];
    if (!decision) return { text: token.text, lang: "X", source: "rule" };

    if (decision.lang === "AMB") {
      const left = nearestDefinite(decided, i, -1);
      const right = nearestDefinite(decided, i, 1);
      const fallback = decision.fallback ?? "EN";
      const lang = left && right ? (left === right ? left : fallback) : (left ?? right ?? fallback);
      return { text: token.text, lang, source: "context" };
    }

    if (decision.lang === "UNK") {
      return unknownPolicy === "en"
        ? { text: token.text, lang: "EN", source: "rule", uncertain: true }
        : { text: token.text, lang: "X", source: "rule", uncertain: true };
    }

    return { text: token.text, lang: decision.lang, source: decision.source };
  });
}
