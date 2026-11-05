import { describe, expect, it } from "vitest";
import { tag } from "./tagger";

const langs = (text: string, options?: Parameters<typeof tag>[1]) => tag(text, options).map((t) => t.lang);

describe("tag: basic Hinglish", () => {
  it("tags Hindi and English words from the lists", () => {
    expect(langs("yaar meeting kal hai")).toEqual(["HI", "EN", "HI", "HI"]);
  });

  it("tags Devanagari as Hindi and Devanagari loanwords as English", () => {
    expect(langs("मुझे मीटिंग चाहिए")).toEqual(["HI", "EN", "HI"]);
  });

  it("treats numbers as neutral", () => {
    expect(langs("5000 rupaye bhej do")).toEqual(["X", "HI", "HI", "HI"]);
  });

  it("treats interjections as neutral, in either script", () => {
    expect(langs("ok hmm")).toEqual(["X", "X"]);
    expect(langs("ओके")).toEqual(["X"]);
  });
});

describe("tag: names", () => {
  it("treats listed names as neutral", () => {
    expect(langs("Rahul kal aayega")).toEqual(["X", "HI", "HI"]);
  });

  it("treats an unknown capitalised mid-sentence word as a name", () => {
    expect(langs("mera dost Zorbax hai")).toEqual(["HI", "HI", "X", "HI"]);
  });

  it("does not treat a capitalised sentence-initial unknown word as a name", () => {
    const [first] = tag("Blorf aaya");
    expect(first?.lang).toBe("EN");
    expect(first?.uncertain).toBe(true);
  });
});

describe("tag: ambiguous words", () => {
  it("resolves 'to' to Hindi between Hindi words", () => {
    expect(langs("mujhe to pata hai")).toEqual(["HI", "HI", "HI", "HI"]);
  });

  it("resolves 'to' to English between English words", () => {
    expect(langs("I want to go")).toEqual(["EN", "EN", "EN", "EN"]);
  });

  it("resolves 'is' to Hindi between Hindi words", () => {
    expect(langs("yeh is ka matlab")).toEqual(["HI", "HI", "HI", "HI"]);
  });

  it("resolves 'is' to English in an English sentence", () => {
    expect(langs("this is good")).toEqual(["EN", "EN", "EN"]);
  });

  it("falls back to the entry default when the neighbours disagree", () => {
    // Known limitation: "kal to meeting" is Hindi "to", but the neighbours disagree.
    expect(langs("kal to meeting")).toEqual(["HI", "EN", "EN"]);
  });

  it("uses the only available neighbour at the edge of a sentence", () => {
    expect(langs("bhej do")).toEqual(["HI", "HI"]);
  });

  it("marks the source of a resolved ambiguous word as context", () => {
    const tokens = tag("mujhe to pata hai");
    expect(tokens[1]?.source).toBe("context");
  });
});

describe("tag: spelling and word forms", () => {
  it("handles elongated spellings", () => {
    expect(langs("yaaar")).toEqual(["HI"]);
    expect(langs("okkk")).toEqual(["X"]);
  });

  it("recognises regular English inflections", () => {
    expect(langs("meetings calling called")).toEqual(["EN", "EN", "EN"]);
  });

  it("tags contractions as English", () => {
    expect(langs("don't worry")).toEqual(["EN", "EN"]);
  });
});

describe("tag: unknown words", () => {
  it("guesses English and marks the token uncertain by default", () => {
    const [token] = tag("blorf");
    expect(token).toMatchObject({ lang: "EN", source: "rule", uncertain: true });
  });

  it("can ignore unknown words instead", () => {
    const [token] = tag("blorf", { unknownPolicy: "x" });
    expect(token).toMatchObject({ lang: "X", uncertain: true });
  });

  it("returns an empty array for empty input", () => {
    expect(tag("")).toEqual([]);
  });
});
