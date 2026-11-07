/**
 * The numbers shown on the site's results page and in the README. They are written down here, once, so the page
 * cannot drift from the evaluation: `published.test.ts` recomputes the tagger figures from the labelled files and
 * fails if these are out of date. The speech and mirror figures need the live Gnani and OpenRouter services, so
 * they are recorded with the date they were measured.
 */
export const PUBLISHED = {
  tagger: {
    heldout: {
      file: "data/eval/tagger.heldout.jsonl",
      utterances: 69,
      tokens: 398,
      correct: 385,
      accuracy: 385 / 398,
      /** Gold rows, predicted columns. */
      confusion: {
        HI: { HI: 253, EN: 13, X: 0 },
        EN: { HI: 0, EN: 128, X: 0 },
        X: { HI: 0, EN: 0, X: 4 },
      },
      ablation: [
        { name: "Full tagger", accuracy: 0.967 },
        { name: "No neighbour rules", accuracy: 0.962 },
        { name: "Unknown words ignored", accuracy: 0.849 },
      ],
    },
    development: { file: "data/eval/tagger.jsonl", utterances: 123, tokens: 620, correct: 613, accuracy: 613 / 620 },
  },
  speech: {
    measuredOn: "2026-11-07",
    clips: 10,
    textToAudioMedianMs: 832,
    textToAudioSlowestMs: 1347,
    audioToTextMedianMs: 271,
    audioToTextSlowestMs: 528,
    hindiShareOffMean: 0.018,
    hindiShareOffWorst: 0.143,
    devanagariTranscripts: 10,
  },
  /** Not finished: the free model quota ran out. Stays null until `pnpm eval:mirror` completes. */
  mirror: null as null | { replies: number; meanGap: Record<string, number> },
} as const;
