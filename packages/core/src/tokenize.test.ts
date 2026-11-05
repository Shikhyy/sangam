import { describe, expect, it } from "vitest";
import { tokenize } from "./tokenize";

const texts = (input: string) => tokenize(input).map((t) => t.text);

describe("tokenize", () => {
  it("drops punctuation and keeps words", () => {
    expect(texts("Yaar, meeting kal hai.")).toEqual(["Yaar", "meeting", "kal", "hai"]);
  });

  it("keeps Devanagari vowel signs and drops the danda", () => {
    expect(texts("मुझे चाहिए।")).toEqual(["मुझे", "चाहिए"]);
  });

  it("marks sentence starts after . ! ? and the danda", () => {
    const tokens = tokenize("Hello. Rahul aaya! kal? ठीक है।");
    const starts = tokens.filter((t) => t.sentenceInitial).map((t) => t.text);
    expect(starts).toEqual(["Hello", "Rahul", "kal", "ठीक"]);
  });

  it("splits on hyphens and slashes", () => {
    expect(texts("well-known yes/no")).toEqual(["well", "known", "yes", "no"]);
  });

  it("drops emoji", () => {
    expect(texts("hi 😀 there")).toEqual(["hi", "there"]);
  });

  it("normalises curly apostrophes and keeps inner apostrophes", () => {
    expect(texts("don’t worry")).toEqual(["don't", "worry"]);
  });

  it("offers de-elongated spellings as lookup candidates", () => {
    const [token] = tokenize("yaaar");
    expect(token?.candidates).toContain("yaar");
    expect(token?.candidates[0]).toBe("yaaar");
  });

  it("flags digits and capitalised words", () => {
    const [amount, name] = tokenize("5000 Rahul");
    expect(amount?.hasDigit).toBe(true);
    expect(name?.capitalized).toBe(true);
  });

  it("returns nothing for empty or punctuation-only input", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("... ,,, !!")).toEqual([]);
  });
});
