import { type TaggedToken, tag } from "@sangam/core";

export interface Turn {
  role: "user" | "assistant";
  text: string;
}

/**
 * The user's earlier turns, tagged, for building a profile (oldest first).
 *
 * Only the last `keep` user turns count. The sentence just sent is usually still in the
 * input box, so when the newest turn equals the text now in the box it is left out, which
 * stops that sentence being counted twice.
 */
export function earlierUserTokens(history: readonly Turn[], current: string, keep = 4): TaggedToken[][] {
  const turns = history.filter((turn) => turn.role === "user").slice(-keep);
  if (turns.at(-1)?.text === current.trim()) turns.pop();
  return turns.map((turn) => tag(turn.text));
}
