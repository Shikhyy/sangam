# Sangam: master plan

Status: planning complete, build starts next. Written 6 Nov 2026.
Hard deadline: **10 Nov 2026, 11:59 PM IST** (Gnani "Great Indian AI Internship Challenge"). Target "feature complete" by the evening of 9 Nov. Submit by the afternoon of 10 Nov at the latest.

## 1. One-liner

Sangam is a code-switching intelligence layer for voice agents. It measures how a user mixes languages (Hindi and English first), then keeps the agent's replies in the same style, so the agent talks the way the user does.

Tagline: **A voice agent that talks like you.**

It is a layer, not a model company. Gnani's Prisma (speech recognition) and Timbre (speech output) are the speech stack. Sangam sits between the transcript and the reply.

## 2. Goals, in priority order

1. **Ship a working playground and API** that runs end to end: microphone, Prisma, Sangam, LLM, Timbre. Execution is checked first.
2. **Win the engagement gate.** Selection starts with verified engagement on one nominated post per platform. The consumer hook ("What's your Hinglish?") and the three-speaker demo exist for this.
3. **Have a credible, honest evaluation:** tagger accuracy, mirror error, a small A/B, latency. Report failures too.
4. **Be interview-ready.** Every design choice has a reason and a measured result.

No one can guarantee selection. This plan maximises the odds that each stage goes well.

## 3. Non-goals (do not build these before 10 Nov)

- Training or fine-tuning any model. (See decision D3.)
- User accounts, billing, dashboards.
- Languages other than Hindi and English.
- Anything that stores audio.
- Medical, legal or financial claims.

## 4. Contest facts to respect

Taken from the contest page on 5 Nov. Re-read the page before submitting, because Gnani may change terms.

- Eligibility: enrolled at an Indian college or university, 18 or older on the registration day. Solo or a team of two. **Confirm you meet this.**
- Required in the submission: a working application shown in a **public demo video**; a written project explanation (title, problem, users, the Gnani models or APIs used, each member's contribution); one nominated post link per platform (LinkedIn and/or X), live before submission, with `#GnaniAI` and `#GreatIndianAIInternshipChallenge`.
- Credits: 5,000 programme credits per registration at app.gnani.ai/voice.
- Data: synthetic data only. No real phone numbers, account numbers, Aadhaar, PAN or recorded calls.
- No purchased engagement, bots, paid promotion, engagement swaps, plagiarism or misleading demos.
- Awards we are shaped for: Mixed Vibes (code-mixed voice experience), Demo Day Drop (60-second demo), Solo Ninja, Crowd Favourite. Internship selection is separate from awards.
- Selection: engagement check, then eligibility (genuine use of Gnani tech), then shortlist by verified engagement, then interviews.

## 5. Product surfaces

1. **Playground (the hero app).** Microphone in, live transcript with a language ribbon, mix meter, stiff-versus-Sangam split screen, a mirror dial, and a "Copy code" button that emits an SDK snippet.
2. **Sangam API.** `profile`, `guide`, `check` (spec in `API.md`).
3. **TypeScript SDK.** A thin client around the API.
4. **"What's your Hinglish?" card.** A shareable profile card generated from 30 to 60 seconds of speech. This is the consumer front door.
5. **Example app: loan-reminder voice agent**, shown before and after Sangam.
6. **Sangam Bench.** Labelled utterances, metrics and a command-line tool so anyone can test their own agent.
7. **Docs.** One clear page: quickstart, metric definitions, API reference, three recipes.

## 6. Scope tiers

| Tier    | Item                                                                                         | Cut rule                             |
| ------- | -------------------------------------------------------------------------------------------- | ------------------------------------ |
| Must    | Core library (tagger, metrics, style guidance) with tests                                    | Never cut                            |
| Must    | Playground with live ribbon, meter and split screen                                          | Never cut                            |
| Must    | `profile` and `guide` endpoints                                                              | Never cut                            |
| Must    | "What's your Hinglish?" card                                                                 | Never cut                            |
| Must    | Evaluation (tagger accuracy, mirror error, small A/B, latency)                               | Shrink the sample, don't drop it     |
| Must    | Demo video, write-up, posts                                                                  | Never cut                            |
| Should  | `check` endpoint                                                                             | Cut if behind on 8 Nov evening       |
| Should  | TypeScript SDK and "Copy code" button                                                        | Cut the button first                 |
| Should  | One-page docs                                                                                | Cut to a README section              |
| Should  | Loan-reminder example app                                                                    | Cut to a scripted scene in the video |
| Stretch | Streaming lane (WebSocket realtime service) for a live ribbon while speaking                 | Only after the REST lane is solid    |
| Stretch | Python SDK, Pipecat/LiveKit processor, Bench CLI                                             | Only if everything above is done     |
| Roadmap | Accounts, streaming sessions, more language pairs, a trained language-ID model, self-hosting | Slide only, not built                |

**Gate on the evening of 8 Nov:** if the playground and the `profile`/`guide` endpoints are not working end to end, cut everything marked Should or lower and spend the remaining time on stability, evaluation and the demo.

## 7. Definition of done (9 Nov evening)

- [ ] A public URL where someone can speak, see the ribbon, and hear Sangam reply in matching style.
- [ ] A recorded 45 to 60 second demo with the three-speaker comparison.
- [ ] Tagger accuracy and mirror error computed on labelled data, with the hero chart.
- [ ] An A/B with at least 15 people, reported with its sample size.
- [ ] README and docs describe what is real and what is mocked.
- [ ] Repo is public, no secrets committed.
- [ ] Posts drafted for LinkedIn and X, with both hashtags.

## 8. Risks and mitigations

| Risk                                                                    | Impact                                   | Mitigation                                                                                         |
| ----------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Gnani credits run out (5,000, cost per minute unknown)                  | Public demo dies                         | Measure cost on Day 1. Rate-limit the public demo. Cache replies. Offer a "recorded session" mode. |
| Prisma output on Hinglish is Devanagari, Roman, or inconsistent         | Tagger breaks                            | Script-aware tokenizer handles both. Measure on Day 1.                                             |
| Timbre handles Roman-script Hindi badly                                 | Replies sound wrong                      | Test both scripts on Day 1. `outputScript` config switches between them.                           |
| Language tagging is wrong on ambiguous words ("to", "me", "is")         | Bad metrics                              | Ambiguity list, neighbour-context rules, LLM fallback, and error analysis in the write-up.         |
| Live latency feels sluggish                                             | Demo feels bad                           | Latency budget in `ARCHITECTURE.md`. Show stage timings. Pre-warm connections.                     |
| Long-lived WebSocket on serverless hosting                              | Streaming fails online                   | REST lane is the primary path (D7). Streaming is an optional separate Node service.                |
| Browser audio format not accepted by Gnani                              | Speech recognition fails on some devices | Encode WAV in the browser (D8). Test on Chrome, Safari and a phone.                                |
| iOS blocks audio that isn't started from a tap                          | Reply is silent on iPhone                | Start playback from the user's gesture. Test on a phone.                                           |
| Scope creep                                                             | Nothing ships                            | Tiers above and the 8 Nov gate.                                                                    |
| No evidence anyone would pay                                            | Weak "launch potential" story            | Talk to 2 to 3 people building voice agents before 9 Nov. Frame pricing as hypotheses.             |
| Prior academic work exists on accommodation (CoNLL 2020, Parekh et al.) | "Not new" criticism                      | Cite it. Our contribution is live, LLM-driven, voice, measured, packaged as an API.                |
| Profile card feels stereotyping                                         | Reputation                               | Playful and neutral. Never infer region, class or background.                                      |

## 9. Decisions log

- **D1. Stack (confirmed 6 Nov):** TypeScript only (strict). pnpm workspaces, no Turborepo or Nx. Next.js (App Router) with React for the web app and API routes, Tailwind CSS, Zod for validation, Vitest for tests, Biome for lint and format, Vercel for hosting. No database, no Python.
- **D2. LLM:** provider-agnostic interface. Default to a fast Claude model for reply generation and tagging fallback. Gnani's Evon is open weights and not on the hosted API, so it is a stretch only if access and a large GPU appear.
- **D3. No custom ML training.** Tagger is lexicon, rules and an LLM fallback. A small classifier is an optional ablation after everything else is done.
- **D4. Bring-your-own keys.** Developers' Gnani keys are used in memory only and never stored.
- **D5. Mock mode.** Everything runs without keys (browser speech APIs and a template reply engine) so development and demos never block on credits.
- **D6. Stateless API.** No audio or text retained by default.
- **D7. REST lane first, streaming lane later.** Push-to-talk (up to 30 s per clip, per Gnani's REST limit; verify) works on Vercel. The WebSocket realtime service, which gives a live ribbon while speaking, is an optional upgrade after the REST lane is solid.
- **D8. Browser records WAV.** An AudioWorklet captures raw audio and we encode 16 kHz WAV ourselves, because built-in recorders produce WebM/Opus (Chrome) or MP4/AAC (Safari) and Gnani's listed REST formats are WAV, MP3, OGG, FLAC, AAC and M4A. Verify on Day 1.
- **D9. Three short calls, orchestrated by the browser.** Speech recognition, then guidance and LLM reply (streamed), then speech output. Never chain them inside one serverless function, to stay clear of time limits.
- **D10. Share card is rendered client-side** so the user's words never go into a URL.
- **D11. Credit and rate caps need a shared counter** (a free Upstash Redis or similar). Without it, fall back to a recorded-session mode if credits run out. Visitors never paste their own keys into the site.

## 10. Day-1 verification list (do first, record answers in `docs/GNANI_NOTES.md`)

- [ ] Registered; credits visible; cost per minute of recognition and per character of synthesis.
- [ ] STT endpoints and headers confirmed (earlier research: base `api.vachana.ai`, header `X-API-Key-ID`, REST up to 30 s, WebSocket streaming). **Verify; do not trust my notes.**
- [ ] Prisma v2.5 versus v3.0: language codes, auto-detect, what Hinglish returns (script and spelling).
- [ ] Audio formats and sample rate the WebSocket expects.
- [ ] Timbre: voices, languages, Roman versus Devanagari input, streaming mode, audio tags in v3.0.
- [ ] Rate limits and error codes.
- [ ] LLM API key available.
- [ ] Optional: request Evon weights; check whether the playground exposes an API.

## 11. Rules for the whole project

- Secrets only in `.env` (git-ignored). Never paste keys in chat, issues or commits.
- Synthetic data, or volunteer data with written consent. Delete audio after transcription. Keep only transcripts and derived metrics.
- Say clearly in the app and docs what is simulated, mocked, or small-sample.
- Cite prior work. Do not imply endorsement by Gnani, Sarvam or anyone else.
- Engagement must be genuine.
