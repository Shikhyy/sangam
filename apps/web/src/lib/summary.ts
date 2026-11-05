import type { MixMetrics, StyleType } from "@sangam/core";

export interface SummaryPart {
  text: string;
  /** Key figures are highlighted in the header. */
  highlight: boolean;
}

const plain = (text: string): SummaryPart => ({ text, highlight: false });
const key = (text: string): SummaryPart => ({ text, highlight: true });
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const STYLE_PHRASE: Record<StyleType, { lead: string; phrase: string }> = {
  "Mid-sentence switcher": { lead: "a ", phrase: "mid-sentence switcher" },
  "Hindi-base, English seasoning": { lead: "", phrase: "Hindi at heart, with English seasoning" },
  "English-base, Hindi seasoning": { lead: "", phrase: "English at heart, with Hindi seasoning" },
  "Mostly Hindi": { lead: "", phrase: "mostly Hindi" },
  "Mostly English": { lead: "", phrase: "mostly English" },
};

/**
 * Describe someone's mix in plain words, with the key figures marked for highlighting.
 * `metrics` describe the latest utterance. `styleType` comes from the profile.
 */
export function summarize(metrics: MixMetrics, styleType: StyleType): SummaryPart[] {
  if (metrics.n === 0) {
    return [plain("Say or type a sentence, and Sangam will show how you mix Hindi and English.")];
  }

  const parts: SummaryPart[] = [plain("You said "), key(count(metrics.n, "word", "words"))];

  if (metrics.nHI > 0 && metrics.nEN > 0) {
    parts.push(
      plain(": "),
      key(`${metrics.nHI} in Hindi`),
      plain(" and "),
      key(`${metrics.nEN} in English`),
      plain(", switching "),
      key(count(metrics.switches, "time", "times")),
      plain("."),
    );
  } else {
    parts.push(plain(", all in "), key(metrics.nHI > 0 ? "Hindi" : "English"), plain("."));
  }

  const { lead, phrase } = STYLE_PHRASE[styleType];
  parts.push(plain(` That makes you ${lead}`), key(phrase), plain("."));
  return parts;
}
