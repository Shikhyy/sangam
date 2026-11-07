import { describe, expect, it } from "vitest";
import {
  buildSystemPrompt,
  DEFAULT_PERSONA,
  isPersonaKey,
  monolingualGuidance,
  PERSONA_KEYS,
  PERSONAS,
  validateHistory,
} from "./prompt";
import { LlmRequestError } from "./types";

describe("buildSystemPrompt", () => {
  it("uses the default persona and the speech rules", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain(DEFAULT_PERSONA);
    expect(prompt).toContain("phone call");
    expect(prompt).toContain("no markdown");
  });

  it("uses a custom persona instead of the default", () => {
    const prompt = buildSystemPrompt({ persona: "You are a clinic receptionist." });
    expect(prompt).toContain("You are a clinic receptionist.");
    expect(prompt).not.toContain(DEFAULT_PERSONA);
  });

  it("puts guidance last", () => {
    const prompt = buildSystemPrompt({ guidance: "Reply in Hinglish." });
    expect(prompt.endsWith("Reply in Hinglish.")).toBe(true);
  });

  it("ignores blank persona and guidance", () => {
    const prompt = buildSystemPrompt({ persona: "   ", guidance: "  " });
    expect(prompt).toContain(DEFAULT_PERSONA);
    expect(prompt.endsWith("stage directions.")).toBe(true);
  });
});

describe("validateHistory", () => {
  it("maps turns to API messages and trims text", () => {
    const messages = validateHistory([
      { role: "user", text: "  hello  " },
      { role: "assistant", text: "hi" },
      { role: "user", text: "payment kab hai?" },
    ]);
    expect(messages).toEqual([
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi" },
      { role: "user", content: "payment kab hai?" },
    ]);
  });

  it("rejects an empty history", () => {
    expect(() => validateHistory([])).toThrow(LlmRequestError);
  });

  it("rejects a history that does not end with a user turn", () => {
    expect(() =>
      validateHistory([
        { role: "user", text: "hello" },
        { role: "assistant", text: "hi" },
      ]),
    ).toThrow("must end with a user turn");
  });

  it("rejects a blank turn", () => {
    expect(() => validateHistory([{ role: "user", text: "   " }])).toThrow("turn 0 is empty");
  });
});

describe("monolingualGuidance", () => {
  it("asks for Hindi or English only", () => {
    expect(monolingualGuidance("hindi")).toContain("formal, standard Hindi");
    expect(monolingualGuidance("english")).toContain("entirely in English");
  });
});

describe("personas", () => {
  it("offers the four agents, and payments is the default persona", () => {
    expect(PERSONA_KEYS).toEqual(["payments", "support", "sales", "appointments"]);
    expect(PERSONAS.payments.prompt).toBe(DEFAULT_PERSONA);
  });

  it("puts the chosen agent in the system prompt", () => {
    const prompt = buildSystemPrompt({ persona: PERSONAS.appointments.prompt });
    expect(prompt).toContain("appointment assistant");
    expect(prompt).not.toContain("payment-reminder");
  });

  it("recognises keys and nothing inherited from objects", () => {
    expect(isPersonaKey("sales")).toBe(true);
    for (const value of ["toString", "__proto__", "constructor", "nope", 1, undefined]) {
      expect(isPersonaKey(value)).toBe(false);
    }
  });
});
