import { mixMetrics } from "./metrics";
import { tag } from "./tagger";

export { BALANCED_BAND, type MixMetrics, matrixFromShare, mixMetrics } from "./metrics";
export {
  buildProfile,
  DEFAULT_DECAY,
  DEFAULT_MIN_TOKENS,
  type ProfileOptions,
  STYLE_THRESHOLDS,
  styleTypeOf,
} from "./profile";
export { type TagOptions, tag } from "./tagger";
export { type RawToken, type Script, tokenize } from "./tokenize";
export type { Lang, MatrixLanguage, Profile, StyleType, TaggedToken, TagSource } from "./types";

/** Tag a piece of text and measure its mix in one call. */
export function analyze(text: string) {
  const tokens = tag(text);
  return { tokens, metrics: mixMetrics(tokens) };
}
