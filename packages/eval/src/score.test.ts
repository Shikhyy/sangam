import { type TaggedToken, tag } from "@sangam/core";
import { describe, expect, it } from "vitest";
import { type EvalItem, parseItem } from "./data";
import { scoreTagger } from "./score";

const item = (id: string, text: string, labels: string): EvalItem => parseItem(JSON.stringify({ id, text, labels }));

/** A predictor that returns fixed labels, ignoring the text. */
const fixed = (labels: string) => (): TaggedToken[] =>
  labels.split(" ").map((lang, index) => ({ text: String(index), lang: lang as TaggedToken["lang"], source: "rule" }));

describe("scoreTagger", () => {
  it("scores a perfect predictor", () => {
    const items = [item("a", "yaar meeting kal hai", "HI EN HI HI")];
    const score = scoreTagger(items, fixed("HI EN HI HI"));
    expect(score.accuracy).toBe(1);
    expect(score.errors).toEqual([]);
    expect(score.perClass.HI).toMatchObject({ precision: 1, recall: 1, f1: 1, support: 3 });
    expect(score.hindiShareMae).toBe(0);
    expect(score.cmiMae).toBe(0);
  });

  it("counts errors, fills the confusion matrix and describes each error", () => {
    const items = [item("a", "kal to meeting hai", "HI HI EN HI")];
    const score = scoreTagger(items, fixed("HI EN EN HI"));

    expect(score.accuracy).toBeCloseTo(0.75);
    expect(score.confusion.HI.EN).toBe(1);
    expect(score.confusion.HI.HI).toBe(2);
    expect(score.errors).toEqual([
      { id: "a", index: 1, text: "to", gold: "HI", predicted: "EN", context: "kal [to] meeting" },
    ]);
  });

  it("computes precision and recall per class", () => {
    // gold:      HI HI EN EN     predicted: HI EN EN EN
    const items = [item("a", "kal hai meeting call", "HI HI EN EN")];
    const score = scoreTagger(items, fixed("HI EN EN EN"));

    expect(score.perClass.HI.precision).toBe(1); // 1 of 1 predicted HI is right
    expect(score.perClass.HI.recall).toBeCloseTo(0.5); // 1 of 2 gold HI found
    expect(score.perClass.EN.precision).toBeCloseTo(2 / 3);
    expect(score.perClass.EN.recall).toBe(1);
    expect(score.perClass.HI.f1).toBeCloseTo(2 / 3);
  });

  it("measures how much the errors move the Hindi share and CMI", () => {
    // gold: 2 HI, 2 EN -> share 0.5, CMI 50. predicted: 3 HI, 1 EN -> share 0.75, CMI 25.
    const items = [item("a", "kal hai meeting call", "HI HI EN EN")];
    const score = scoreTagger(items, fixed("HI HI HI EN"));
    expect(score.hindiShareMae).toBeCloseTo(0.25);
    expect(score.cmiMae).toBeCloseTo(25);
  });

  it("skips utterances with no Hindi or English tokens in the profile errors", () => {
    const items = [item("a", "ok hmm", "X X"), item("b", "kal hai", "HI HI")];
    const score = scoreTagger(items, (text) => tag(text));
    expect(score.hindiShareMae).toBe(0);
    expect(score.tokens).toBe(4);
  });

  it("throws when the predictor returns the wrong number of tokens", () => {
    const items = [item("a", "kal hai", "HI HI")];
    expect(() => scoreTagger(items, fixed("HI"))).toThrow("predicted 1 tokens but the gold labels have 2");
  });

  it("handles an empty set", () => {
    const score = scoreTagger([], () => []);
    expect(score).toMatchObject({ items: 0, tokens: 0, accuracy: 0, hindiShareMae: 0 });
  });

  it("works with the real tagger", () => {
    const items = [item("a", "yaar meeting kal hai", "HI EN HI HI")];
    expect(scoreTagger(items, (text) => tag(text)).accuracy).toBe(1);
  });

  it("shows what the neighbour rules contribute", () => {
    const items = [item("a", "mujhe to pata hai", "HI HI HI HI")];
    const withRules = scoreTagger(items, (text) => tag(text));
    const withoutRules = scoreTagger(items, (text) => tag(text, { resolveAmbiguous: false }));
    expect(withRules.accuracy).toBe(1);
    expect(withoutRules.accuracy).toBeCloseTo(0.75);
  });
});
