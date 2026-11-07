import { describe, expect, it } from "vitest";
import { CARD_MAX_CHARS, cardOf, cleanCardText } from "./card";

describe("cleanCardText", () => {
  it("trims, collapses spaces and keeps it short", () => {
    expect(cleanCardText("  kal   meeting \n hai ")).toBe("kal meeting hai");
    expect(cleanCardText("a".repeat(500))).toHaveLength(CARD_MAX_CHARS);
  });

  it("handles a missing value", () => {
    expect(cleanCardText(null)).toBe("");
    expect(cleanCardText(undefined)).toBe("");
  });
});

describe("cardOf", () => {
  it("measures a mixed sentence", () => {
    const card = cardOf("yaar meeting kal hai but mujhe time nahi pata");
    expect(card.hasWords).toBe(true);
    expect(card.hindiPercent).toBe(67);
    expect(card.englishPercent).toBe(33);
    expect(card.hindiPercent + card.englishPercent).toBe(100);
    expect(card.style).toBe("Mid-sentence switcher");
    expect(card.words).toBe(9);
  });

  it("has nothing to show for empty or number-only text", () => {
    for (const text of ["", "   ", "12345", null]) {
      const card = cardOf(text);
      expect(card.hasWords).toBe(false);
      expect(card.style).toBeNull();
    }
  });

  it("sees a mostly English speaker as mostly English", () => {
    const card = cardOf("when is my payment due");
    expect(card.englishPercent).toBeGreaterThan(80);
  });
});
