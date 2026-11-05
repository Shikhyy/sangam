export type ReplyMode = "typical" | "sangam";

export interface ReplyTurn {
  role: "user" | "assistant";
  text: string;
}

export interface ParsedReplyRequest {
  mode: ReplyMode;
  history: ReplyTurn[];
  guidance?: string;
  targetHindiShare?: number;
}

/** Limits that keep one request small, whoever sends it. */
export const LIMITS = { turns: 20, textChars: 500, guidanceChars: 2000 } as const;

export type ParseResult = { ok: true; value: ParsedReplyRequest } | { ok: false; error: string };

const fail = (error: string): ParseResult => ({ ok: false, error });

/** Check an untrusted request body and return a clean, typed request. */
export function parseReplyRequest(body: unknown): ParseResult {
  if (typeof body !== "object" || body === null) return fail("The request must be a JSON object.");
  const { mode, history, guidance, targetHindiShare } = body as Record<string, unknown>;

  if (mode !== "typical" && mode !== "sangam") return fail('mode must be "typical" or "sangam".');

  if (!Array.isArray(history) || history.length === 0) return fail("history must be a non-empty list of turns.");
  if (history.length > LIMITS.turns) return fail(`history can hold at most ${LIMITS.turns} turns.`);

  const turns: ReplyTurn[] = [];
  for (const [index, entry] of history.entries()) {
    if (typeof entry !== "object" || entry === null) return fail(`Turn ${index} must be an object.`);
    const { role, text } = entry as Record<string, unknown>;
    if (role !== "user" && role !== "assistant") return fail(`Turn ${index} needs a role of "user" or "assistant".`);
    if (typeof text !== "string" || !text.trim()) return fail(`Turn ${index} needs some text.`);
    if (text.length > LIMITS.textChars) return fail(`Turn ${index} is longer than ${LIMITS.textChars} characters.`);
    turns.push({ role, text: text.trim() });
  }
  if (turns[turns.length - 1]?.role !== "user") return fail("The last turn must come from the user.");

  const value: ParsedReplyRequest = { mode, history: turns };

  if (guidance !== undefined) {
    if (typeof guidance !== "string") return fail("guidance must be a string.");
    if (guidance.length > LIMITS.guidanceChars)
      return fail(`guidance is longer than ${LIMITS.guidanceChars} characters.`);
    value.guidance = guidance;
  }
  if (targetHindiShare !== undefined) {
    if (typeof targetHindiShare !== "number" || !(targetHindiShare >= 0 && targetHindiShare <= 1)) {
      return fail("targetHindiShare must be a number from 0 to 1.");
    }
    value.targetHindiShare = targetHindiShare;
  }

  return { ok: true, value };
}
