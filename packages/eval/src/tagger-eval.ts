import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { type TagOptions, tag } from "@sangam/core";
import { parseJsonl } from "./data";
import { scoreTagger, type TaggerScore } from "./score";

/** The ablation: the full tagger, then each part switched off or changed. */
const CONFIGS: { name: string; options: TagOptions }[] = [
  { name: "full tagger", options: {} },
  { name: "no neighbour rules", options: { resolveAmbiguous: false } },
  { name: "unknown words ignored", options: { unknownPolicy: "x" } },
];

const REAL_PATH = "data/eval/tagger.jsonl";
const SEED_PATH = "data/eval/tagger.seed.jsonl";
const OUT_DIR = "eval/out";

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const pad = (text: string, width: number) => text.padEnd(width);

function printTable(rows: { name: string; score: TaggerScore }[]) {
  const header = ["configuration", "accuracy", "HI F1", "EN F1", "X F1", "share MAE", "CMI MAE"];
  console.log(header.map((h, i) => pad(h, i === 0 ? 24 : 10)).join(""));
  for (const { name, score } of rows) {
    const cells = [
      name,
      pct(score.accuracy),
      pct(score.perClass.HI.f1),
      pct(score.perClass.EN.f1),
      pct(score.perClass.X.f1),
      score.hindiShareMae.toFixed(3),
      score.cmiMae.toFixed(2),
    ];
    console.log(cells.map((c, i) => pad(c, i === 0 ? 24 : 10)).join(""));
  }
}

function main() {
  const argument = process.argv[2];
  const path = argument ?? (existsSync(REAL_PATH) ? REAL_PATH : SEED_PATH);
  const items = parseJsonl(readFileSync(path, "utf8"));
  const isSeed = path.endsWith("seed.jsonl");

  console.log(`Tagger evaluation: ${items.length} utterances from ${path}\n`);
  if (isSeed) {
    console.log("SEED DATA: these labels were written by Claude to test the harness.");
    console.log("Do not report these numbers. Label real data (see data/eval/README.md).\n");
  }

  const rows = CONFIGS.map(({ name, options }) => ({
    name,
    score: scoreTagger(items, (text) => tag(text, options)),
  }));
  printTable(rows);

  const full = rows[0]?.score;
  if (!full) return;

  console.log(`\nConfusion for the full tagger (rows are gold, columns are predicted)`);
  console.log(`${pad("", 6)}${pad("HI", 8)}${pad("EN", 8)}${pad("X", 8)}`);
  for (const gold of ["HI", "EN", "X"] as const) {
    const row = full.confusion[gold];
    console.log(`${pad(gold, 6)}${pad(String(row.HI), 8)}${pad(String(row.EN), 8)}${pad(String(row.X), 8)}`);
  }

  console.log(`\nErrors for the full tagger (${full.errors.length} of ${full.tokens} tokens)`);
  for (const error of full.errors.slice(0, 20)) {
    console.log(`  ${pad(error.id, 7)}${pad(error.context, 34)} gold ${error.gold}, predicted ${error.predicted}`);
  }
  if (full.errors.length > 20) console.log(`  ... and ${full.errors.length - 20} more (see ${OUT_DIR}/tagger.json)`);

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    `${OUT_DIR}/tagger.json`,
    JSON.stringify({ path, isSeed, items: items.length, results: rows }, null, 2),
  );
  console.log(`\nFull results written to ${OUT_DIR}/tagger.json`);
}

main();
