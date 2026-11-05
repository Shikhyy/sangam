# Evaluation plan

Principle: small, honest, reproducible. State sample sizes on every chart. Report failures. Never claim improvements the data does not show.

## E1. Tagger accuracy

**Question:** how accurately does the tagger label each token as Hindi, English or neutral?

**Data:** about 150 utterances in `data/eval/tagger.jsonl`, each as `{ id, text, source, tokens: [{ text, lang }] }`.

- Sources: volunteer transcripts (with consent), self-written, and LLM-generated Hinglish. Record the mix, because LLM-written text is cleaner than real speech.
- Cover: Roman-script and Devanagari transcripts, ambiguous words ("to", "me", "is", "the"), names, numbers, spelling variants, filler words.

**Labelling protocol:**

1. Label every token yourself.
2. Ask one friend to independently label a random 30 utterances.
3. Compute agreement (Cohen's kappa) on those 30 and report it.
4. Resolve disagreements by discussion and record the rule you settled on.

**Metrics:** token accuracy overall and per class (precision and recall for HI and EN). Mean absolute error of the Hindi share and of CMI per utterance.

**Ablation (cheap and useful):** lexicon only; plus ambiguity rules; plus LLM fallback. Show each step's gain.

**Error analysis:** list the 10 most frequent error types with examples (for example names mistaken for English words) and what was done about each.

## E2. Speech recognition robustness (live only)

**Question:** how do Prisma's modes behave on code-mixed speech, and does that change the profile?

**Data:** about 40 short clips (volunteers, or Timbre-generated speech with added noise). Keep every clip under 30 seconds.

**Conditions:** explicit Hindi language setting versus auto-detect (v3.0), and v2.5 versus v3.0 if both are available.

**Metrics:** token-level agreement with the reference transcript (a simple word error rate), the change in Hindi share and CMI caused by recognition errors, and the share of outputs in Roman versus Devanagari.

**Cost note:** each clip uses credits. Count them before running.

## E3. Mirror fidelity

**Question:** how close is the agent's mix to the user's mix, for three agent styles?

**Setup:**

- Personas (`data/eval/personas.json`): three scripted speakers, each with 5 utterances: A (Hindi-base, English nouns), B (English-base, Hindi seasoning), C (mid-sentence switcher).
- Scenarios (`data/eval/scenarios.json`): 5 neutral tasks (a payment reminder, a booking change, a delivery query, a plan question, a complaint).
- Conditions: (1) agent replies in Hindi only, (2) agent replies in English only, (3) Sangam guidance.
- 3 personas × 5 scenarios × 3 conditions = 45 replies.

**Metrics:** `deltaHindiShare` (primary), `deltaCMI` and `deltaSR` (secondary), measured by the same tagger. **Caveat to state in the write-up:** the tagger measures its own output, so also report agreement on a hand-labelled sample of 20 replies, to show the measure is not circular.

**Hero chart:** mean `deltaHindiShare` per condition, with the sample size on it.

## E4. Human A/B

**Question:** do people rate the Sangam replies as more comfortable and natural?

**Participants:** at least 15, ideally 20, people who mix Hindi and English in daily speech. Friends and classmates are fine, but say so in the write-up.

**Design:**

- Each participant hears or reads 4 scenario replies from their own persona type (match them to A, B or C using a short sample of their own speech, or let them pick).
- For each, they see two replies in random order: baseline (Hindi-only or English-only, whichever is further from their mix) and Sangam. They don't know which is which.
- Ratings: 1 to 5 for "sounded natural", "I felt understood", "I would prefer this agent", plus a forced choice.
- Also record clarification turns ("kya?", "samjha nahi") if you run the live version for a few people.

**Reporting:** counts, medians, and the forced-choice split. With about 20 people a result is indicative, not conclusive, and the write-up should say exactly that.

**Consent:** a short written consent line. No names stored. Store only ratings.

## E5. Latency

**Question:** how long from end of speech to first audio?

**Method:** the realtime service logs timing events per turn. Run at least 30 live turns.

**Report:** P50 and P95 for each stage and end to end, on the machine and network used. State the hosting setup.

## E6. Cost and limits

Credits consumed per minute of speech and per 1,000 characters synthesised, and how many demo sessions the credits allow. Include this in the write-up. It shows launch-potential thinking.

## What we will not claim

- That Sangam improves collections, satisfaction or retention. We measure rater preference and mirror error only.
- That the tagger works on languages other than Hindi and English.
- Any number computed on data we did not collect.

## Reproducibility

- `eval/` scripts read from `data/eval` and write JSON and charts to `eval/out`.
- One command runs the offline evaluations (E1, E3 on cached replies). Live evaluations (E2, E5) are separate commands that need keys.
- Pin the LLM model name and temperature in the results file.

## Output artefacts

- `eval/out/tagger.json` and a confusion table
- `eval/out/mirror.json` and the hero chart
- `eval/out/ab.json`
- `eval/out/latency.json`
- A short `docs/RESULTS.md` written from these, including limitations
