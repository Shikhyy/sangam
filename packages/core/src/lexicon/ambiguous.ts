/**
 * Words that are valid in both Hindi (romanised) and English. The tagger resolves
 * them from their neighbours. The value is the language to use when the
 * neighbours give no answer, or disagree.
 *
 * Do not also list these words in hi-roman.ts or en-common.ts.
 */
export const AMBIGUOUS: ReadonlyMap<string, "HI" | "EN"> = new Map<string, "HI" | "EN">([
  // Usually English when unresolved
  ["to", "EN"], // Hindi particle "toh"/"to" vs English "to"
  ["me", "EN"], // "mein" vs "me"
  ["is", "EN"], // "is" (इस, this) vs English "is"
  ["the", "EN"], // "the" (थे, were) vs English "the"
  ["are", "EN"], // "are" (interjection) vs English "are"
  ["us", "EN"], // "us" (उस, that) vs English "us"
  ["so", "EN"],
  ["do", "EN"], // "do" (two / give) vs English "do"
  ["he", "EN"], // SMS "he" (hai) vs English "he"
  ["per", "EN"], // "par" variant vs English "per"
  ["may", "EN"], // "may" (main, I) vs English "may"
  // Usually Hindi when unresolved
  ["main", "HI"], // "main" (मैं, I) vs English "main"
  ["hum", "HI"], // "hum" (we) vs English "hum"
  ["ham", "HI"], // "ham" (we) vs English "ham"
  ["tab", "HI"], // "tab" (then) vs English "tab"
  ["mat", "HI"], // "mat" (don't) vs English "mat"
  ["ya", "HI"], // "ya" (or) vs informal English "ya"
  ["mile", "HI"], // "mile" (met) vs English "mile"
]);
