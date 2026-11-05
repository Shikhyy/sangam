/** HI = Hindi, EN = English, X = language-neutral (names, numbers, interjections). */
export type Lang = "HI" | "EN" | "X";

/** How a token's tag was decided. */
export type TagSource = "script" | "lexicon" | "context" | "llm" | "rule";

export interface TaggedToken {
  /** The token as it appeared, with surrounding punctuation removed. */
  text: string;
  lang: Lang;
  source: TagSource;
  /** True when the tag is a guess (unknown word). A fallback can re-tag these. */
  uncertain?: boolean;
}

export type MatrixLanguage = "HI" | "EN" | "balanced";

export type StyleType =
  | "Mostly Hindi"
  | "Mostly English"
  | "Mid-sentence switcher"
  | "Hindi-base, English seasoning"
  | "English-base, Hindi seasoning";

export interface Profile {
  /** Non-neutral tokens the profile is based on. */
  tokenCount: number;
  /** Share of Hindi among Hindi + English tokens, 0..1. 0.5 when there is no data. */
  hindiShare: number;
  /** Code-Mixing Index (Das and Gambäck), 0..50 for two languages. */
  cmi: number;
  /** Language switches per adjacent token pair, 0..1. */
  switchRate: number;
  matrixLanguage: MatrixLanguage;
  styleType: StyleType;
  /** "low" when fewer than `minTokens` tokens back the profile. */
  confidence: "low" | "ok";
  /** Up to five minority-language words the speaker used. */
  signatureWords: string[];
}
