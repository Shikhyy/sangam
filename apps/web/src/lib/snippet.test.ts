import { describe, expect, it } from "vitest";
import { buildSnippet } from "./snippet";

describe("buildSnippet", () => {
  it("writes the call with the chosen settings", () => {
    expect(buildSnippet({ register: "neutral", outputScript: "roman", maxSentences: 2 })).toBe(
      [
        "// from the settings on this page",
        "const guide = await sangam.guide({",
        "  profile,",
        '  register: "neutral",',
        '  outputScript: "roman",',
        "  maxSentences: 2,",
        "});",
      ].join("\n"),
    );
  });

  it("follows the settings", () => {
    const snippet = buildSnippet({ register: "formal", outputScript: "devanagari", maxSentences: 1 });
    expect(snippet).toContain('register: "formal"');
    expect(snippet).toContain('outputScript: "devanagari"');
    expect(snippet).toContain("maxSentences: 1");
  });
});
