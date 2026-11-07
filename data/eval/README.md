# Evaluation data

Labelled utterances for measuring the language tagger (experiment E1 in `docs/EVAL.md`).

## Files

| File                | What it is                                                                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tagger.seed.jsonl` | 28 utterances **labelled by Claude** to test the harness. It includes cases the tagger is expected to miss. **Never report numbers from this file.** |
| `tagger.jsonl`      | Your real labelled set (create it). The evaluation uses it when it exists.                                                                           |
| `utterances.txt`    | Optional: raw utterances, one per line, before labelling.                                                                                            |

Real data comes from volunteers (with consent), your own writing, or generated text. Record which in `source`. Generated text is cleaner than real speech, so keep the mix visible. Use synthetic or consented data only. No names of real people, phone numbers, account numbers or recorded calls.

## Format

One JSON object per line:

```json
{
  "id": "u001",
  "text": "yaar meeting kal hai",
  "source": "volunteer",
  "tokens": "yaar meeting kal hai",
  "labels": "HI EN HI HI"
}
```

- `id`: unique.
- `text`: the utterance as transcribed.
- `source`: where it came from.
- `tokens`: a read-only helper showing how the tokenizer splits `text`. If present it must match.
- `labels`: one tag per token, space-separated, in the same order: `HI`, `EN` or `X`.

The harness refuses a file with the wrong number of labels, an unknown tag, a duplicate id or a `tokens` field that does not match, and it names the line.

## Labelling rules

Decide each token by its **meaning in that sentence**, not by what the tagger would say.

| Tag  | Use for                                                                                                                                           |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HI` | Hindi words, in Roman or Devanagari script, including Hindi particles ("to", "is", "the" when they mean Hindi toh, इस, थे) and Hindi emphasis "hi" |
| `EN` | English words, including English words written in Devanagari (मीटिंग) and English acronyms (OTP, EMI)                                              |
| `X`  | Names of people, numbers, interjections and fillers (ok, hmm, haha), and anything that is not clearly either language                             |

Write down any rule you settle on while labelling, and apply it consistently.

## Workflow

1. Put raw utterances in `data/eval/utterances.txt`, one per line.
2. Make a draft: `pnpm eval:draft data/eval/utterances.txt --source volunteer > data/eval/tagger.jsonl`. Correct every `labels` field by hand.
   - Starting from the tagger's guesses is fast but can bias you towards them. Check each one deliberately.
3. For the agreement check, ask a friend to label a random 30 utterances **from scratch**: `pnpm eval:draft data/eval/subset.txt --blank > data/eval/friend.jsonl`, then they set every label.
4. Compare: `pnpm eval:agreement data/eval/tagger.jsonl data/eval/friend.jsonl`. Report the kappa, and resolve disagreements by discussion.
5. Run the evaluation: `pnpm eval:tagger`. It prints accuracy, per-class F1, the Hindi-share and CMI errors, a confusion table and the worst errors, for the full tagger and for two ablations. Results are written to `eval/out/tagger.json`, which git ignores.

## What the numbers mean

- **Accuracy** is the share of tokens tagged correctly. `X` tokens are included, so check the per-class scores too.
- **Share MAE and CMI MAE** are the average error of the per-utterance Hindi share and Code-Mixing Index. They show how much tagging mistakes move the profile, which is what the product uses.
- The **ablations** show what each part contributes: "no neighbour rules" gives ambiguous words their list default, and "unknown words ignored" drops unrecognised words instead of guessing English.
