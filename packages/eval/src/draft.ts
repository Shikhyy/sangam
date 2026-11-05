import { readFileSync } from "node:fs";
import { tag, tokenize } from "@sangam/core";
import { formatItem } from "./data";

/**
 * Turn a text file (one utterance per line) into draft JSONL labels, using the tagger.
 *
 *   pnpm eval:draft data/eval/utterances.txt --source volunteer > data/eval/tagger.draft.jsonl
 *
 * Correct the `labels` field by hand. Caution: starting from the tagger's guesses can
 * bias the annotator towards them. For the agreement check, the second annotator
 * should label from scratch (`--blank`).
 */
function main() {
  const args = process.argv.slice(2);
  const path = args.find((arg) => !arg.startsWith("--"));
  if (!path) {
    console.error("usage: draft <utterances.txt> [--source <name>] [--prefix <p>] [--blank]");
    process.exit(1);
  }

  const option = (name: string, fallback: string) => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? (args[index + 1] ?? fallback) : fallback;
  };
  const source = option("source", "unknown");
  const prefix = option("prefix", "u");
  const blank = args.includes("--blank");

  const lines = readFileSync(path, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  lines.forEach((text, index) => {
    const id = `${prefix}${String(index + 1).padStart(3, "0")}`;
    const tokens = blank
      ? tokenize(text).map((token) => ({ text: token.text, lang: "X" as const }))
      : tag(text).map((token) => ({ text: token.text, lang: token.lang }));
    console.log(formatItem({ id, text, source, tokens }));
  });

  console.error(
    `${lines.length} utterances. ${blank ? "Labels are blank (all X): set every one." : "Labels are the tagger's guesses: check every one."}`,
  );
}

main();
