import { type Lang, tokenize } from "@sangam/core";

export const LANGS: readonly Lang[] = ["HI", "EN", "X"];

export interface EvalToken {
  text: string;
  lang: Lang;
}

export interface EvalItem {
  id: string;
  text: string;
  /** Where the utterance came from, for example "volunteer" or "self-written". */
  source: string;
  tokens: EvalToken[];
}

const isLang = (value: string): value is Lang => (LANGS as readonly string[]).includes(value);

/**
 * Parse one JSONL line. The line holds `id`, `text`, `labels` (one HI/EN/X tag per
 * token, space-separated, in tokenizer order), and optionally `source` and a
 * `tokens` helper string that must match the tokenizer.
 */
export function parseItem(line: string): EvalItem {
  const raw: unknown = JSON.parse(line);
  if (typeof raw !== "object" || raw === null) throw new Error("expected a JSON object");
  const { id, text, source, labels, tokens: helper } = raw as Record<string, unknown>;

  if (typeof id !== "string" || !id) throw new Error("missing string field id");
  if (typeof text !== "string" || !text.trim()) throw new Error(`${id}: missing string field text`);
  if (typeof labels !== "string") throw new Error(`${id}: missing string field labels`);

  const words = tokenize(text).map((token) => token.text);
  const tags = labels.trim().split(/\s+/).filter(Boolean);

  if (tags.length !== words.length) {
    throw new Error(`${id}: ${tags.length} labels for ${words.length} tokens (${words.join(" ")})`);
  }
  const bad = tags.find((tag) => !isLang(tag));
  if (bad) throw new Error(`${id}: unknown label "${bad}" (use HI, EN or X)`);
  if (helper !== undefined && helper !== words.join(" ")) {
    throw new Error(`${id}: tokens field does not match the tokenizer (expected "${words.join(" ")}")`);
  }

  return {
    id,
    text,
    source: typeof source === "string" ? source : "unknown",
    tokens: words.map((word, index) => ({ text: word, lang: tags[index] as Lang })),
  };
}

/** Parse a whole JSONL file. Errors name the line. Blank lines are skipped; ids must be unique. */
export function parseJsonl(content: string): EvalItem[] {
  const items: EvalItem[] = [];
  const seen = new Set<string>();

  content.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    try {
      const item = parseItem(line);
      if (seen.has(item.id)) throw new Error(`${item.id}: duplicate id`);
      seen.add(item.id);
      items.push(item);
    } catch (error) {
      throw new Error(`line ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  return items;
}

/** Serialise an item as one JSONL line, in the same format `parseItem` reads. */
export function formatItem(item: EvalItem): string {
  return JSON.stringify({
    id: item.id,
    text: item.text,
    source: item.source,
    tokens: item.tokens.map((token) => token.text).join(" "),
    labels: item.tokens.map((token) => token.lang).join(" "),
  });
}
