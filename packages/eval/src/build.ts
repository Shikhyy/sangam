import { readFileSync, writeFileSync } from "node:fs";
import { type EvalItem, formatItem } from "./data";

/**
 * Build the labelled JSONL from the compact source file, where every token is written as word=LABEL.
 *
 *   pnpm eval:build data/eval/tagger.src.txt data/eval/tagger.jsonl --source claude-written
 */
const NAMES = { H: "HI", E: "EN", X: "X" } as const;

function main() {
  const args = process.argv.slice(2);
  const [input, output] = args.filter((arg) => !arg.startsWith("--"));
  if (!input || !output) {
    console.error("usage: build <source.txt> <output.jsonl> [--source <name>]");
    process.exit(1);
  }
  const at = args.indexOf("--source");
  const source = at >= 0 ? (args[at + 1] ?? "unknown") : "unknown";

  const lines = readFileSync(input, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  const items: EvalItem[] = lines.map((line, index) => ({
    id: `e${String(index + 1).padStart(3, "0")}`,
    text: line
      .split(/\s+/)
      .map((piece) => piece.slice(0, piece.lastIndexOf("=")))
      .join(" "),
    source,
    tokens: line.split(/\s+/).map((piece) => {
      const cut = piece.lastIndexOf("=");
      const label = piece.slice(cut + 1) as keyof typeof NAMES;
      if (!(label in NAMES)) throw new Error(`line ${index + 1}: "${piece}" needs =H, =E or =X`);
      return { text: piece.slice(0, cut), lang: NAMES[label] };
    }),
  }));

  writeFileSync(output, `${items.map(formatItem).join("\n")}\n`);
  console.log(`${items.length} utterances written to ${output}`);
}

main();
