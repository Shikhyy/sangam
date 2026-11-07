# Results

Everything here can be reproduced from this repository. Where a number is weak, this page says so.

## E1. Tagger accuracy

**Data.** Two sets of Hinglish utterances, labelled token by token as Hindi (HI), English (EN) or neutral (X: names, numbers, fillers). The rules are in [data/eval/README.md](../data/eval/README.md).

| Set         | File                             | Utterances | Tokens | Purpose                                                      |
| ----------- | -------------------------------- | ---------- | ------ | ------------------------------------------------------------ |
| Development | `data/eval/tagger.jsonl`         | 123        | 620    | Used to find gaps in the Hindi word list                     |
| Held-out    | `data/eval/tagger.heldout.jsonl` | 69         | 398    | Written **after** the word list was extended. Never tuned on |

**How the sets were made.** Both were written and labelled by Claude (an AI), by meaning, before looking at the tagger's output. They cover payments, support, sales, appointments and casual talk, in Roman and Devanagari script. There is no human second annotator, so there is no agreement score. Text written by a model is cleaner than real speech, so real-world accuracy is probably lower.

**Held-out result (the number to quote).**

| Configuration         | Accuracy               | HI F1 | EN F1 | X F1  | Hindi share error | CMI error |
| --------------------- | ---------------------- | ----- | ----- | ----- | ----------------- | --------- |
| Full tagger           | **96.7%** (385 of 398) | 97.5% | 95.2% | 100%  | 0.033             | 3.35      |
| No neighbour rules    | 96.2%                  | 97.1% | 94.5% | 100%  | 0.038             | 3.55      |
| Unknown words ignored | 84.9%                  | 97.5% | 77.5% | 11.8% | 0.111             | 10.78     |

With 398 tokens the 95% interval is roughly 94.8% to 98.6%. It is wider than that in practice, because tokens in one sentence are not independent.

**What went wrong.** All 13 errors are the same kind: a Hindi word the word list does not know, such as "aayegi", "likhiye", "boliye" or "shaadi", which the tagger calls English. It never called an English word Hindi. The word list is hand-written and incomplete on purpose; the fix is a bigger list or a model fallback, not a different design.

**Before and after on the development set.** The first run, before the word list was extended, scored 92.4% (47 errors in 620 tokens), almost all missing Hindi verb forms ("jaunga", "sakte", "lagega"), plus weekday names called names. After extending the list it scores 98.9%. That second number is **not evidence**, because the list was extended while looking at those errors.

**One label corrected after scoring.** In the held-out set I first labelled "chai" as English by mistake. It is Hindi, and the tagger was right. I fixed the label and re-ran: 96.5% became 96.7%. This is the only label changed after seeing results.

**Known limit.** The word "hi" is treated as a greeting (neutral), so Hindi emphasis "hi" ("open hi nahi hota") is missed. A few such tokens are lost on purpose.

Reproduce:

```bash
pnpm eval:tagger data/eval/tagger.heldout.jsonl
pnpm eval:tagger
```

## E3. Mirror fidelity

**Question.** Does Sangam's guidance move an agent's replies closer to the speaker's own mix than an agent that always answers in Hindi, or always in English?

**Setup.** `pnpm eval:mirror`. Three scripted speakers (Hindi base with English nouns, English base with Hindi seasoning, and a mid-sentence switcher) each ask five neutral questions (a payment date, a booking change, a late order, a plan question, a bill complaint). Three agents answer each question using the real free OpenRouter models: Hindi only, English only, and Sangam guidance. The score is the gap between each reply's Hindi share and the speaker's. That is 45 replies.

**Status: not run to completion.** The free OpenRouter quota ran out partway through (a first pass reached 37 of 45 replies, then the provider returned 429 "too many requests", and a second pass reached only 6 before stopping). Partial numbers from a handful of replies would mean nothing, so none are reported. The script now saves every reply as it arrives and carries on where it stopped, so it can be finished when the quota resets:

```bash
pnpm eval:mirror
```

Run it again until it prints the summary table. Results are written to `eval/out/mirror.json`.

**Caveat to state with the result.** The tagger measures its own output (the replies are scored by the same tagger that guides them), so the gap is partly circular. It is a measure of consistency, not proof that people like the replies. That needs a human test (E4 in [EVAL.md](EVAL.md)), which has not been done.

## Not done yet

- A second human annotator, and an agreement score (`pnpm eval:agreement`).
- E2: speech recognition robustness on real clips.
- E4: a human A/B test with at least 15 people.
- The microphone path has only been tested with generated audio, not on a real phone.
