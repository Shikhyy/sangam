# Task list (day by day)

Today is Fri 6 Nov. Deadline Tue 10 Nov, 11:59 PM IST. Times are targets, not promises. If something slips, apply the cut rules in `PLAN.md` section 6.

## Day 0, Fri 6 Nov (tonight): foundations

You (needs you, not me):

- [ ] Register at app.gnani.ai/voice. Confirm eligibility with the contest page.
- [ ] Put the Gnani key in `.env` (never in chat). Note the credits.
- [ ] Get an LLM API key and put it in `.env`.
- [ ] Post the teaser (see `CONTENT.md`).

Build:

- [ ] `git init`, pnpm workspace, TypeScript config, Vitest, lint, `.gitignore`, `.env.example`.
- [ ] `packages/core`: tokenizer, script detection, lexicon loader, tagger (lexicon + ambiguity rules), metrics, style type, profile windowing. Tests.
- [ ] Seed lexicons: first draft of `hi_roman.txt`, `en_common.txt`, `ambiguous.json`, `devanagari_loan_en.txt`, `neutral.txt`.
- [ ] Day-1 Gnani spike (only if the key is in): one REST STT call, one WebSocket STT call, one TTS call. Fill in `docs/GNANI_NOTES.md` with answers to the verification list.

Exit criteria: `pnpm test` passes for core. You can run `profile` on a string in a script.

## Day 1, Sat 7 Nov: pipeline and data

- [ ] `packages/gnani`: STT stream, STT REST, TTS stream, mock mode.
- [ ] `packages/llm`: provider interface, real provider, mock provider.
- [ ] `core.guide` and `core.check` with tests.
- [ ] `apps/realtime`: WebSocket session, event contract, timing events, credit guard.
- [ ] Label the first 100 utterances for E1. Recruit your volunteer friend for the 30-utterance agreement check.
- [ ] Collect consented volunteer samples (transcripts only after processing).
- [ ] First end-to-end run in mock mode: speak, see tags and a reply.

Exit criteria: a terminal or bare page shows a live transcript, tags, profile and a reply, in mock mode at least.

## Day 2, Sun 8 Nov: playground and the gate

- [ ] `apps/web` playground: mic, transcript with ribbon, mix meter, split screen, mirror dial, latency strip, mock/live badge.
- [ ] `/api/v1/profile` and `/api/v1/guide` routes with validation and rate limits.
- [ ] "What's your Hinglish?" card: record, process, render image, privacy line.
- [ ] Run E1 (tagger evaluation, ablation, error analysis). Fix the top error types.
- [ ] Run E3 (mirror fidelity) on cached replies.
- [ ] Post the 20-second preview clip (see `CONTENT.md`).
- [ ] **Evening gate:** is the playground working end to end with `profile` and `guide`? If not, cut Should and lower items.

Exit criteria: a person can open the page on a laptop, speak, and hear a matched reply.

## Day 3, Mon 9 Nov: polish, evidence, ship

- [ ] Deploy web and realtime. Test the public URL on a phone.
- [ ] A/B study with at least 15 people (E4). Run live latency test (E5). Measure cost (E6).
- [ ] `check` endpoint, SDK, "Copy code" button, one-page docs (only if the gate passed and time remains).
- [ ] Record the demo video (three speakers, split screen). Add captions.
- [ ] Write `docs/RESULTS.md` and the contest write-up (see `CONTENT.md`).
- [ ] Make the repo public after a secrets scan.
- [ ] Post the main post on LinkedIn and X with both hashtags. This is the post you nominate.

Exit criteria: everything in the Definition of Done in `PLAN.md` section 7.

## Day 4, Tue 10 Nov: buffer and submit

- [ ] Re-read the contest page and the submission form. Check every required field.
- [ ] Reply to comments on your posts genuinely.
- [ ] Fix any bug found during final testing. No new features.
- [ ] Submit by the afternoon. Confirm the nominated post links are live.
- [ ] Prepare interview notes (see `CONTENT.md`).

## Daily habits

- Commit small and often.
- Update `GNANI_NOTES.md` with anything surprising.
- Keep a running "what failed" list. It feeds the write-up and the interview.
- Stop adding features at the end of 8 Nov.

## Dependencies on you

| Item                                                          | Needed by                            |
| ------------------------------------------------------------- | ------------------------------------ |
| Gnani key and credits                                         | Day 0 night, or latest Day 1 morning |
| LLM API key                                                   | Day 1 morning                        |
| Volunteer participants                                        | Day 1 (samples) and Day 3 (A/B)      |
| Confirmation that you meet the eligibility rules              | Today                                |
| Two or three conversations with people who build voice agents | By Day 3                             |
