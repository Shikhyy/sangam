# Architecture

## 1. Repo layout (planned)

```
sangam/
├─ apps/
│  ├─ web/            Next.js: playground, card, docs pages, API routes (profile/guide/check)
│  └─ realtime/       OPTIONAL upgrade lane: Node WebSocket service for live streaming (see section 6)
├─ packages/
│  ├─ core/           Pure TypeScript: tokenizer, language tagger, metrics, style controller. No network.
│  ├─ gnani/          Thin Prisma/Timbre clients with a mock mode
│  ├─ llm/            Provider-agnostic reply + fallback-tagging interface (real + mock)
│  └─ sdk/            Client for the Sangam API (Should-tier)
├─ data/
│  ├─ lexicon/        hi_roman.txt, en_common.txt, devanagari_loan_en.txt, ambiguous.json, neutral.txt
│  ├─ eval/           tagger.jsonl (labelled utterances), personas.json, scenarios.json
│  └─ audio/          (git-ignored) volunteer clips, deleted after transcription
├─ eval/              Scripts that read data/eval and write results + charts
├─ docs/              PLAN, ARCHITECTURE, API, EVAL, TASKS, CONTENT, GNANI_NOTES
├─ .env.example
└─ README.md
```

pnpm workspaces. Node 24 and pnpm 9 are installed locally. Tests with Vitest. Lint and format with Biome. Zod for request validation and env parsing. Tailwind CSS for styling. Packages are consumed from source (no build step); Next.js uses `transpilePackages`, scripts run with `tsx`. `packages/core` has no I/O, so it is easy to test and reuse in the browser, the API and the eval scripts.

## 2. Data flow, primary lane: REST, push-to-talk

The browser orchestrates three short calls (decision D9). Each fits well inside serverless time limits.

```
Browser: AudioWorklet -> 16 kHz WAV (max 30 s)               [D8]
   │  1. POST /api/stt       (server holds the Gnani key)
   ▼
Gnani STT (REST) ─► transcript
   │
   ▼  browser runs core.tag / core.profile locally (pure TS, instant ribbon + meter)
   │  2. POST /api/reply     { history, profile, register }  -> streamed text
   ▼
core.guide ─► llm.reply (stream) ─► core.check (optional one rewrite)
   │  3. POST /api/tts       { text } -> audio
   ▼
Gnani TTS (REST) ─► audio ─► played from a user tap (iOS rule)
```

The split screen runs step 2 twice in parallel (no guidance versus Sangam guidance) and plays either one on demand. `core` runs in the browser too, so the ribbon appears the moment a transcript arrives.

The ribbon fills after the user stops speaking (not during). The streaming lane below fixes that.

## 2b. Data flow, streaming lane (optional upgrade)

```
Browser mic (PCM16, 16 kHz)
   │  WebSocket
   ▼
apps/realtime ──► Gnani STT (WebSocket)  ── partial / final transcript
   │                                           │
   │   ◄────────────── transcript ─────────────┘
   ▼
core.tag(transcript)  ─► tokens with HI / EN / X tags
core.profile(window)  ─► mix profile (Hindi share, CMI, switch rate, matrix, type)
   │
   ├──► events to browser: ribbon, meter, profile (live, per partial)
   │
   ▼  on final transcript = user turn
core.guide(profile, register) ─► target style + prompt fragment
llm.reply(history, guidance)   ─► streamed reply text
core.check(reply, target)      ─► mirror score (optional rewrite once)
   ▼
Gnani TTS (stream) ─► audio chunks ─► browser speakers
```

The split screen runs the same turn twice in parallel: once with no guidance (the "stiff" agent) and once with Sangam guidance. Both replies and both audio streams are shown.

## 3. Core library (`packages/core`)

### 3.1 Tokenizer

- Normalise: Unicode NFC, lowercase Latin, collapse repeated letters ("yaaar" to "yaar" via a small elongation rule), strip punctuation but keep it for display.
- Script-aware: Devanagari tokens and Latin tokens are handled separately.

### 3.2 Language tagger

Tags per token: `HI`, `EN`, `X` (neutral: names, numbers, interjections, symbols).

Pipeline, first match wins:

1. Numbers, URLs, emoji, punctuation: `X`.
2. **Devanagari token:** `HI`, unless it is in `devanagari_loan_en.txt` (English words written in Devanagari, e.g. meeting, payment), then `EN`.
3. **Latin token:**
   - In `neutral.txt` (names list, interjections like "oh", "hmm"): `X`.
   - In `ambiguous.json` (words valid in both, e.g. "to", "me", "is", "the", "are", "so"): resolve by neighbours. If both nearest tagged neighbours are `HI`, then `HI`. If both are `EN`, then `EN`. Otherwise use the entry's default.
   - In `hi_roman.txt` (romanised Hindi: hai, nahi, kya, matlab, bhai, ...): `HI`.
   - In `en_common.txt`: `EN`.
   - Otherwise: mark `unknown`.
4. **Fallback for `unknown`:** one batched LLM call per utterance (tokens in, tags out, strict JSON). Cached. Mock mode: tag as `X`.

Lexicons are built from open word lists plus an LLM-generated and hand-reviewed romanised-Hindi list. Record sources in `data/lexicon/README.md`.

### 3.3 Metrics (all deterministic)

Let `n` be the number of non-`X` tokens, `nHI` and `nEN` the counts per language.

- **Hindi share** `H = nHI / n` (0 if n = 0).
- **Code-Mixing Index** `CMI = 100 × (1 − max(nHI, nEN) / n)` (0 if n = 0). After Das and Gambäck. Range 0 to 50 for two languages.
- **Switch rate** `SR = switches / (n − 1)`, where a switch is two adjacent non-`X` tokens with different tags (0 if n < 2).
- **Matrix language:** the majority language, or `balanced` if within 5 percentage points.

### 3.4 Style type (playful label for the card)

Thresholds are tunable constants in one file.

| Condition (evaluated in order) | Label                         |
| ------------------------------ | ----------------------------- |
| `H ≥ 0.85`                     | Mostly Hindi                  |
| `H ≤ 0.15`                     | Mostly English                |
| `SR ≥ 0.25`                    | Mid-sentence switcher         |
| `H ≥ 0.5`                      | Hindi-base, English seasoning |
| otherwise                      | English-base, Hindi seasoning |

Also computed for the card: top 5 signature switch words (most frequent minority-language tokens), and the user's most frequent fillers.

### 3.5 Conversation profile

Keep a sliding window over the last 5 user turns with exponential decay (alpha 0.6) so the profile can drift. Trust it only after 20 tagged tokens; before that, fall back to a balanced prior. Always report the number of tokens it is based on.

### 3.6 Style controller (`guide`)

Inputs: profile, `register` (`formal | neutral | casual`), `outputScript` (`roman | devanagari`).
Outputs:

- `target`: `{ hindiShare, switchRate, matrixLanguage }`, with hindiShare clamped to what the register allows (a formal bank agent does not copy slang).
- `promptFragment`: plain instructions for the LLM, for example: reply mostly in Hindi (about 70%), keep English for nouns the user already uses in English (list), keep sentences short, written in Roman script.
- `borrowedWords`: up to 8 words the user used and the agent may reuse.
- `avoid`: items such as slang above the register.

### 3.7 Mirror check (`check`)

Tag the draft reply, compute `H`, `CMI`, `SR`. Report `deltaH = |H_reply − H_target|`, `deltaCMI`, `deltaSR`, and a pass flag (`deltaH ≤ 0.15`). If it fails, the realtime service may request a single rewrite with a stricter instruction. Never loop more than once, to protect latency.

## 4. Gnani integration (`packages/gnani`)

- `stt.stream()`: WebSocket client for Prisma. `stt.transcribe()`: REST for short clips (card flow, eval).
- `tts.stream()`: streaming Timbre. `tts.synthesize()`: REST for caching.
- Config: model version, language code, output script, voice, audio format.
- **All endpoint details are provisional** until Day 1 verification (see `PLAN.md` section 10 and `GNANI_NOTES.md`).
- Mock mode (`SANGAM_MODE=mock`): the browser's SpeechRecognition supplies transcripts and speechSynthesis supplies audio. Mock mode proves the pipeline, not the quality, and must be labelled in the UI.
- Credit guard: a per-session cap on seconds of speech and characters synthesised, plus a global daily cap. When hit, the UI offers recorded sessions.

## 5. LLM layer (`packages/llm`)

- Interface: `reply({ history, guidance, register }) -> AsyncIterable<string>` and `tagUnknowns(tokens) -> tags`.
- Real provider: a fast Claude model via the Anthropic API (`ANTHROPIC_API_KEY`). The interface also accepts any OpenAI-compatible endpoint.
- Mock provider: a deterministic template engine for a few scenarios, so demos and tests never need a key.
- Temperature low. Strict JSON for tagging. Reply length capped at about 2 sentences for voice.

## 6. Realtime service (`apps/realtime`), optional upgrade lane

Build this only after the REST lane works end to end (see decision D7 in `PLAN.md`).

- Node with `ws`. One WebSocket per browser session. The Gnani key lives only here (or comes from the developer's own key in memory).
- Client messages: `audio` chunks, `control` (start, stop, register, mode, dial override).
- Server events: `partial`, `final`, `tags`, `profile`, `guidance`, `reply.text`, `reply.audio`, `timing`, `error`.
- **Timing events** record each stage (end of speech to final transcript, guide, LLM first token, TTS first audio) so the UI can show a latency strip and the eval can compute P50 and P95.
- Deployed separately from the web app, because serverless functions cannot hold long-lived sockets.

## 6a. Latency budget (targets, to be measured)

| Stage                                 | Target          |
| ------------------------------------- | --------------- |
| Final transcript after end of speech  | under 400 ms    |
| Tagger + profile + guide (local code) | under 20 ms     |
| LLM first token                       | under 600 ms    |
| TTS first audio                       | under 300 ms    |
| **End of speech to first audio**      | **under 1.5 s** |

## 7. Web app (`apps/web`)

- Audio capture: AudioWorklet to PCM, encoded as 16 kHz mono WAV in the browser; push-to-talk capped at 30 s. Needs HTTPS or localhost for the microphone.
- Orchestration: the browser calls `/api/stt`, `/api/reply` and `/api/tts` in sequence (D9). Only these routes touch the Gnani or LLM keys, via server-only modules.
- Results page `/results`: renders the evaluation JSON as charts, so the hero chart lives in the product.
- Playground page: mic button, transcript with ribbon, mix meter, split screen, mirror dial, latency strip, mock/live badge, "Copy code".
- Card page: record, process, render a shareable image (canvas or server-side) with the type, stats, a mini ribbon of the user's own sentence, and signature words. Includes a privacy line: audio is processed to make the card and not kept.
- API routes: `/api/v1/profile`, `/api/v1/guide`, `/api/v1/check` (pure functions over `packages/core`, so they are fast and cheap).
- Docs page and an OpenAPI file served from `/docs`.
- Design: two neutral colours for the two languages, not flag colours. Mobile-first, since people will open links on phones.

## 8. Configuration (`.env.example`)

```
SANGAM_MODE=mock            # mock | live
GNANI_API_KEY=              # never commit
GNANI_STT_MODEL=            # fill after Day 1
GNANI_TTS_MODEL=
GNANI_TTS_VOICE=
ANTHROPIC_API_KEY=          # never commit
SANGAM_DAILY_SPEECH_CAP_SEC=
SANGAM_SESSION_SPEECH_CAP_SEC=
```

## 9. Testing

- `packages/core`: unit tests for tokenizer, tagger cases (including every ambiguous word), metrics, style type boundaries, profile windowing. Golden tests from `data/eval/tagger.jsonl`.
- Realtime: an integration test that plays a recorded clip through mock mode and checks events and timing fields.
- No test calls the Gnani API by default (credits). A separate opt-in `pnpm test:live`.

## 10. Security and privacy

- Keys only in environment variables. `.env` is git-ignored. CI-style check for secrets before the first public push.
- Stateless API. No audio persisted. Transcripts kept only in memory for the session, except consented eval transcripts stored under `data/eval`.
- Basic rate limiting on all public endpoints. Input length caps.
- Sanitise user text before putting it in prompts, and treat it as data, not instructions.
- A visible notice that voice is processed by Gnani's API and by the LLM provider.

## 11. Deployment

- Web: Vercel (or any static plus serverless host).
- Realtime: a small Node host (Fly.io, Render or similar). Free tiers may sleep, so show a short "waking up" state and test it before the video.
- For the video, run locally if hosting is flaky. The public link must still work by submission.
