export type Script = "devanagari" | "latin" | "none";

export interface RawToken {
  /** The token with surrounding punctuation removed. */
  text: string;
  /** Lowercased for Latin, unchanged for Devanagari. */
  norm: string;
  /** Lookup spellings to try, most literal first (handles "yaaar" -> "yaar"). */
  candidates: string[];
  script: Script;
  /** First token of the text or of a sentence. */
  sentenceInitial: boolean;
  /** Starts with an uppercase letter followed by lowercase (e.g. "Rahul"). */
  capitalized: boolean;
  hasDigit: boolean;
}

// Strip anything that is not a letter, combining mark or digit from both ends.
// \p{M} matters: Devanagari vowel signs (matras) are marks, not letters.
const EDGE_JUNK = /^[^\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}]+$/gu;
const DEVANAGARI = /[ऀ-ॿ]/;
const LATIN = /[A-Za-z]/;
const DIGIT = /\p{N}/u;
const CAPITALIZED = /^\p{Lu}\p{Ll}+/u;
// A chunk ending in . ! ? or the Devanagari danda (optionally followed by a closing quote or bracket).
const SENTENCE_END = /[.!?।॥]+["')\]]*$/u;

function candidatesFor(lower: string): string[] {
  const found = new Set<string>([lower]);
  const collapsedToTwo = lower.replace(/(.)\1{2,}/gu, "$1$1");
  found.add(collapsedToTwo);
  found.add(collapsedToTwo.replace(/(.)\1+/gu, "$1"));
  return [...found];
}

/**
 * Split text into word tokens. Whitespace, hyphens, underscores, slashes and
 * dashes separate tokens. Punctuation and emoji are dropped.
 */
export function tokenize(text: string): RawToken[] {
  const tokens: RawToken[] = [];
  const chunks = text.normalize("NFC").replace(/[‘’]/g, "'").split(/\s+/);
  let atSentenceStart = true;

  for (const chunk of chunks) {
    if (!chunk) continue;
    const endsSentence = SENTENCE_END.test(chunk);

    for (const part of chunk.split(/[-_/–—]+/)) {
      const cleaned = part.replace(EDGE_JUNK, "");
      if (!cleaned) continue;

      const script: Script = DEVANAGARI.test(cleaned) ? "devanagari" : LATIN.test(cleaned) ? "latin" : "none";
      const norm = script === "latin" ? cleaned.toLowerCase() : cleaned;

      tokens.push({
        text: cleaned,
        norm,
        candidates: script === "latin" ? candidatesFor(norm) : [norm],
        script,
        sentenceInitial: atSentenceStart,
        capitalized: script === "latin" && CAPITALIZED.test(cleaned),
        hasDigit: DIGIT.test(cleaned),
      });
      atSentenceStart = false;
    }

    if (endsSentence) atSentenceStart = true;
  }

  return tokens;
}
