import type { Lang } from "@sangam/core";
import { type EvalItem, LANGS } from "./data";

export interface Kappa {
  kappa: number;
  /** Share of tokens both annotators labelled the same. */
  agreement: number;
  n: number;
}

/**
 * Cohen's kappa: agreement between two annotators beyond what chance would give.
 * 1 is perfect agreement, 0 is chance level. If chance agreement is already 1 (both
 * used one label throughout) it returns 1.
 */
export function cohensKappa(a: readonly Lang[], b: readonly Lang[]): Kappa {
  if (a.length !== b.length) throw new Error(`label lists differ in length (${a.length} vs ${b.length})`);
  const n = a.length;
  if (n === 0) return { kappa: 0, agreement: 0, n: 0 };

  const countsA: Record<Lang, number> = { HI: 0, EN: 0, X: 0 };
  const countsB: Record<Lang, number> = { HI: 0, EN: 0, X: 0 };
  let matches = 0;
  a.forEach((label, index) => {
    const other = b[index] as Lang;
    countsA[label] += 1;
    countsB[other] += 1;
    if (label === other) matches += 1;
  });

  const observed = matches / n;
  const expected = LANGS.reduce((sum, lang) => sum + (countsA[lang] / n) * (countsB[lang] / n), 0);
  return { kappa: expected === 1 ? 1 : (observed - expected) / (1 - expected), agreement: observed, n };
}

export interface AgreementReport extends Kappa {
  /** Utterances both annotators labelled. */
  items: number;
  onlyInA: string[];
  onlyInB: string[];
}

/** Compare two annotators' files. Utterances are matched by id and must have identical text. */
export function compareAnnotations(a: readonly EvalItem[], b: readonly EvalItem[]): AgreementReport {
  const byIdB = new Map(b.map((item) => [item.id, item]));
  const labelsA: Lang[] = [];
  const labelsB: Lang[] = [];
  const onlyInA: string[] = [];
  let items = 0;

  for (const itemA of a) {
    const itemB = byIdB.get(itemA.id);
    if (!itemB) {
      onlyInA.push(itemA.id);
      continue;
    }
    if (itemA.text !== itemB.text) throw new Error(`${itemA.id}: the text differs between the two files`);
    byIdB.delete(itemA.id);
    items += 1;
    itemA.tokens.forEach((token, index) => {
      labelsA.push(token.lang);
      labelsB.push((itemB.tokens[index] as { lang: Lang }).lang);
    });
  }

  return { ...cohensKappa(labelsA, labelsB), items, onlyInA, onlyInB: [...byIdB.keys()] };
}
