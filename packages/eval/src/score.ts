import { type Lang, mixMetrics, type TaggedToken } from "@sangam/core";
import { type EvalItem, LANGS } from "./data";

export interface ClassStats {
  precision: number;
  recall: number;
  f1: number;
  /** Gold tokens of this class. */
  support: number;
}

export interface TokenError {
  id: string;
  index: number;
  text: string;
  gold: Lang;
  predicted: Lang;
  /** The word with its neighbours, for example "kal [to] meeting". */
  context: string;
}

export interface TaggerScore {
  items: number;
  tokens: number;
  accuracy: number;
  perClass: Record<Lang, ClassStats>;
  /** confusion[gold][predicted] */
  confusion: Record<Lang, Record<Lang, number>>;
  /** Mean absolute error of the per-utterance Hindi share, over utterances with Hindi/English tokens. */
  hindiShareMae: number;
  /** Mean absolute error of the per-utterance Code-Mixing Index, over the same utterances. */
  cmiMae: number;
  errors: TokenError[];
}

const ratio = (numerator: number, denominator: number) => (denominator === 0 ? 0 : numerator / denominator);

const emptyRow = (): Record<Lang, number> => ({ HI: 0, EN: 0, X: 0 });

/**
 * Score a tagger against gold labels. `predict` receives the utterance text and must
 * return one tag per token, in tokenizer order (the core tagger does).
 */
export function scoreTagger(items: readonly EvalItem[], predict: (text: string) => TaggedToken[]): TaggerScore {
  const confusion: Record<Lang, Record<Lang, number>> = { HI: emptyRow(), EN: emptyRow(), X: emptyRow() };
  const errors: TokenError[] = [];
  let correct = 0;
  let total = 0;
  let shareError = 0;
  let cmiError = 0;
  let measured = 0;

  for (const item of items) {
    const predicted = predict(item.text);
    if (predicted.length !== item.tokens.length) {
      throw new Error(
        `${item.id}: predicted ${predicted.length} tokens but the gold labels have ${item.tokens.length}`,
      );
    }

    item.tokens.forEach((gold, index) => {
      const guess: Lang = predicted[index]?.lang ?? "X";
      confusion[gold.lang][guess] += 1;
      total += 1;
      if (guess === gold.lang) {
        correct += 1;
        return;
      }
      const before = item.tokens[index - 1]?.text;
      const after = item.tokens[index + 1]?.text;
      errors.push({
        id: item.id,
        index,
        text: gold.text,
        gold: gold.lang,
        predicted: guess,
        context: [before, `[${gold.text}]`, after].filter(Boolean).join(" "),
      });
    });

    const goldTagged: TaggedToken[] = item.tokens.map((t) => ({ text: t.text, lang: t.lang, source: "lexicon" }));
    const goldMix = mixMetrics(goldTagged);
    if (goldMix.n > 0) {
      const predictedMix = mixMetrics(predicted);
      shareError += Math.abs(goldMix.hindiShare - predictedMix.hindiShare);
      cmiError += Math.abs(goldMix.cmi - predictedMix.cmi);
      measured += 1;
    }
  }

  const perClass = {} as Record<Lang, ClassStats>;
  for (const lang of LANGS) {
    const truePositives = confusion[lang][lang];
    const support = LANGS.reduce((sum, other) => sum + confusion[lang][other], 0);
    const predictedAs = LANGS.reduce((sum, other) => sum + confusion[other][lang], 0);
    const precision = ratio(truePositives, predictedAs);
    const recall = ratio(truePositives, support);
    perClass[lang] = { precision, recall, f1: ratio(2 * precision * recall, precision + recall), support };
  }

  return {
    items: items.length,
    tokens: total,
    accuracy: ratio(correct, total),
    perClass,
    confusion,
    hindiShareMae: ratio(shareError, measured),
    cmiMae: ratio(cmiError, measured),
    errors,
  };
}
