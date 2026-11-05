import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatItem, parseItem, parseJsonl } from "./data";

const line = (over: Record<string, unknown> = {}) =>
  JSON.stringify({ id: "a1", text: "yaar meeting kal hai", labels: "HI EN HI HI", ...over });

describe("parseItem", () => {
  it("parses a valid line into tokens with labels", () => {
    const item = parseItem(line({ source: "volunteer" }));
    expect(item.id).toBe("a1");
    expect(item.source).toBe("volunteer");
    expect(item.tokens).toEqual([
      { text: "yaar", lang: "HI" },
      { text: "meeting", lang: "EN" },
      { text: "kal", lang: "HI" },
      { text: "hai", lang: "HI" },
    ]);
  });

  it("defaults the source", () => {
    expect(parseItem(line()).source).toBe("unknown");
  });

  it("rejects the wrong number of labels", () => {
    expect(() => parseItem(line({ labels: "HI EN" }))).toThrow("2 labels for 4 tokens");
  });

  it("rejects an unknown label", () => {
    expect(() => parseItem(line({ labels: "HI EN HI XX" }))).toThrow('unknown label "XX"');
  });

  it("rejects a tokens helper that does not match the tokenizer", () => {
    expect(() => parseItem(line({ tokens: "yaar meeting kal" }))).toThrow("tokens field does not match");
  });

  it("accepts a matching tokens helper", () => {
    expect(parseItem(line({ tokens: "yaar meeting kal hai" })).tokens).toHaveLength(4);
  });

  it("rejects missing fields", () => {
    expect(() => parseItem(JSON.stringify({ text: "hi", labels: "X" }))).toThrow("missing string field id");
    expect(() => parseItem(JSON.stringify({ id: "a", labels: "X" }))).toThrow("missing string field text");
    expect(() => parseItem(JSON.stringify({ id: "a", text: "hi" }))).toThrow("missing string field labels");
  });
});

describe("parseJsonl", () => {
  it("skips blank lines", () => {
    const items = parseJsonl(`${line()}\n\n${line({ id: "a2" })}\n`);
    expect(items.map((item) => item.id)).toEqual(["a1", "a2"]);
  });

  it("names the line of an error", () => {
    expect(() => parseJsonl(`${line()}\n${line({ id: "a2", labels: "HI" })}`)).toThrow("line 2: a2:");
  });

  it("rejects duplicate ids", () => {
    expect(() => parseJsonl(`${line()}\n${line()}`)).toThrow("duplicate id");
  });

  it("names the line of invalid JSON", () => {
    expect(() => parseJsonl("{not json")).toThrow("line 1:");
  });
});

describe("formatItem", () => {
  it("round-trips through parseItem", () => {
    const item = parseItem(line({ source: "volunteer" }));
    expect(parseItem(formatItem(item))).toEqual(item);
  });
});

describe("the seed file", () => {
  const seed = parseJsonl(readFileSync(new URL("../../../data/eval/tagger.seed.jsonl", import.meta.url), "utf8"));

  it("is valid and has a useful number of utterances", () => {
    expect(seed.length).toBeGreaterThanOrEqual(25);
  });

  it("is marked as written by Claude, so it is not mistaken for real data", () => {
    expect(new Set(seed.map((item) => item.source))).toEqual(new Set(["seed-written-by-claude"]));
  });

  it("uses all three labels", () => {
    const labels = new Set(seed.flatMap((item) => item.tokens.map((token) => token.lang)));
    expect(labels).toEqual(new Set(["HI", "EN", "X"]));
  });
});
