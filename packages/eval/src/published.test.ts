import { readFileSync } from "node:fs";
import { tag } from "@sangam/core";
import { describe, expect, it } from "vitest";
import { parseJsonl } from "./data";
import { PUBLISHED } from "./published";
import { scoreTagger } from "./score";

describe("published results", () => {
  for (const [name, set] of [
    ["held-out", PUBLISHED.tagger.heldout],
    ["development", PUBLISHED.tagger.development],
  ] as const) {
    it(`match what the tagger scores on the ${name} set`, () => {
      const items = parseJsonl(readFileSync(set.file, "utf8"));
      const score = scoreTagger(items, (text) => tag(text));
      const correct = Math.round(score.accuracy * score.tokens);

      expect(items.length).toBe(set.utterances);
      expect(score.tokens).toBe(set.tokens);
      expect(correct).toBe(set.correct);
    });
  }

  it("matches the held-out confusion table", () => {
    const items = parseJsonl(readFileSync(PUBLISHED.tagger.heldout.file, "utf8"));
    const score = scoreTagger(items, (text) => tag(text));
    expect(score.confusion).toEqual(PUBLISHED.tagger.heldout.confusion);
  });
});
