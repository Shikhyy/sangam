import { mixMetrics, tag } from "@sangam/core";
import { describe, expect, it } from "vitest";
import { summarize } from "./summary";

const sentence = (parts: { text: string }[]) => parts.map((p) => p.text).join("");
const highlights = (parts: { text: string; highlight: boolean }[]) =>
  parts.filter((p) => p.highlight).map((p) => p.text);

describe("summarize", () => {
  it("describes a mixed sentence and highlights the figures", () => {
    const metrics = mixMetrics(tag("yaar meeting kal hai but mujhe time nahi pata"));
    const parts = summarize(metrics, "Mid-sentence switcher");
    expect(sentence(parts)).toBe(
      "You said 9 words: 6 in Hindi and 3 in English, switching 6 times. That makes you a mid-sentence switcher.",
    );
    expect(highlights(parts)).toEqual(["9 words", "6 in Hindi", "3 in English", "6 times", "mid-sentence switcher"]);
  });

  it("handles a single language", () => {
    const parts = summarize(mixMetrics(tag("kal hai")), "Mostly Hindi");
    expect(sentence(parts)).toBe("You said 2 words, all in Hindi. That makes you mostly Hindi.");
    expect(highlights(parts)).toEqual(["2 words", "Hindi", "mostly Hindi"]);
  });

  it("handles English only", () => {
    const parts = summarize(mixMetrics(tag("hello there friend")), "Mostly English");
    expect(sentence(parts)).toContain("all in English");
  });

  it("uses the singular for one word and one switch", () => {
    expect(sentence(summarize(mixMetrics(tag("meeting")), "Mostly English"))).toContain("You said 1 word,");
    expect(sentence(summarize(mixMetrics(tag("kal meeting")), "Mid-sentence switcher"))).toContain("switching 1 time.");
  });

  it("describes the two base-language styles in words", () => {
    const metrics = mixMetrics(tag("kal meeting hai"));
    expect(sentence(summarize(metrics, "Hindi-base, English seasoning"))).toContain(
      "Hindi at heart, with English seasoning",
    );
    expect(sentence(summarize(metrics, "English-base, Hindi seasoning"))).toContain(
      "English at heart, with Hindi seasoning",
    );
  });

  it("invites the user to speak when there is nothing yet", () => {
    const parts = summarize(mixMetrics(tag("")), "Mostly Hindi");
    expect(sentence(parts)).toContain("Say or type a sentence");
    expect(highlights(parts)).toEqual([]);
  });

  it("ignores neutral words in the counts", () => {
    expect(sentence(summarize(mixMetrics(tag("5000 rupaye hai")), "Mostly Hindi"))).toContain("You said 2 words");
  });
});
