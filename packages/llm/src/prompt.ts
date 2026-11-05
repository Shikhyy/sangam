import { type ChatTurn, LlmRequestError } from "./types";

export const DEFAULT_PERSONA =
  "You are a polite payment-reminder assistant for a lending company. You help the customer understand a payment that is due and how to pay it.";

const SPEECH_RULES =
  "You are speaking on a phone call. Your reply is converted to speech, so write plain spoken sentences only: no markdown, lists, emoji, brackets or stage directions.";

/** Build the system prompt from a persona and optional style guidance. */
export function buildSystemPrompt(options: { persona?: string; guidance?: string } = {}): string {
  const { persona, guidance } = options;
  return [persona?.trim() || DEFAULT_PERSONA, SPEECH_RULES, guidance?.trim()].filter(Boolean).join("\n\n");
}

/**
 * Check a conversation and turn it into API messages.
 * It must be non-empty, end with a user turn, and have no blank turns.
 */
export function validateHistory(history: readonly ChatTurn[]): { role: "user" | "assistant"; content: string }[] {
  if (history.length === 0) throw new LlmRequestError("history must contain at least one turn");

  const messages = history.map((turn, index) => {
    const content = turn.text.trim();
    if (!content) throw new LlmRequestError(`turn ${index} is empty`);
    return { role: turn.role, content };
  });

  if (messages[messages.length - 1]?.role !== "user") {
    throw new LlmRequestError("history must end with a user turn");
  }
  return messages;
}

/** Guidance for the single-language baseline agents used in the evaluation. */
export function monolingualGuidance(language: "hindi" | "english"): string {
  return language === "hindi"
    ? "Reply entirely in formal, standard Hindi written in Roman script. Do not use English words except names and terms with no common Hindi equivalent."
    : "Reply entirely in English. Do not use Hindi words.";
}
