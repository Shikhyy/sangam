import { readFileSync } from "node:fs";
import { parseJsonl } from "./data";
import { compareAnnotations } from "./kappa";

/**
 * Agreement between two annotators:
 *
 *   pnpm eval:agreement data/eval/mine.jsonl data/eval/friend.jsonl
 *
 * Utterances are matched by id and must have the same text.
 */
function main() {
  const [pathA, pathB] = process.argv.slice(2);
  if (!pathA || !pathB) {
    console.error("usage: agreement <annotator-a.jsonl> <annotator-b.jsonl>");
    process.exit(1);
  }

  const report = compareAnnotations(parseJsonl(readFileSync(pathA, "utf8")), parseJsonl(readFileSync(pathB, "utf8")));

  console.log(`Utterances compared:  ${report.items}`);
  console.log(`Tokens compared:      ${report.n}`);
  console.log(`Raw agreement:        ${(report.agreement * 100).toFixed(1)}%`);
  console.log(`Cohen's kappa:        ${report.kappa.toFixed(3)}`);
  if (report.onlyInA.length > 0) console.log(`Only in the first file:  ${report.onlyInA.join(", ")}`);
  if (report.onlyInB.length > 0) console.log(`Only in the second file: ${report.onlyInB.join(", ")}`);
  console.log("\nA common rule of thumb reads 0.61 to 0.80 as substantial and above 0.80 as almost perfect.");
  console.log("Resolve disagreements by discussion and write down the rule you settled on.");
}

main();
