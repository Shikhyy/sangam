# Sangam API (v0 draft)

All endpoints are JSON over HTTPS, stateless, no data retained. Base path: `/api/v1`. Authentication for v0: none on the demo host, rate-limited. (Keys and accounts are roadmap.)

Languages in v0: `hi` (Hindi) and `en` (English) only.

## Types

```ts
type Lang = "HI" | "EN" | "X"; // X = neutral (names, numbers, interjections)

interface TaggedToken {
  text: string; // as it appeared
  lang: Lang;
  source: "script" | "lexicon" | "context" | "llm" | "rule";
}

interface Profile {
  tokenCount: number; // non-X tokens the profile is based on
  hindiShare: number; // 0..1
  cmi: number; // 0..50
  switchRate: number; // 0..1
  matrixLanguage: "HI" | "EN" | "balanced";
  styleType:
    | "Mostly Hindi"
    | "Mostly English"
    | "Mid-sentence switcher"
    | "Hindi-base, English seasoning"
    | "English-base, Hindi seasoning";
  confidence: "low" | "ok"; // low if tokenCount < 20
  signatureWords: string[]; // up to 5 minority-language words
}

type Register = "formal" | "neutral" | "casual";
type OutputScript = "roman" | "devanagari";
```

## POST /api/v1/profile

Measure how someone mixes languages.

Request:

```json
{
  "utterances": ["Yaar meeting kal hai, but mujhe nahi pata kitne baje."],
  "decay": 0.6
}
```

- `utterances`: 1 to 10 strings, oldest first. Each at most 1,000 characters. Total at most 5,000.
- `decay`: optional, exponential weight for older utterances. Default 0.6.

Response 200:

```json
{
  "tokens": [[{ "text": "Yaar", "lang": "HI", "source": "lexicon" }]],
  "profile": {
    "tokenCount": 10,
    "hindiShare": 0.6,
    "cmi": 40,
    "switchRate": 0.44,
    "matrixLanguage": "HI",
    "styleType": "Mid-sentence switcher",
    "confidence": "low",
    "signatureWords": ["meeting", "but"]
  }
}
```
`tokens` has one array per utterance, so a client can draw the ribbon.

## POST /api/v1/guide

Turn a profile into reply guidance.

Request:

```json
{
  "profile": { "...": "Profile from /profile" },
  "register": "neutral",
  "outputScript": "roman",
  "recentUserWords": ["meeting", "payment", "yaar"]
}
```

Response 200:

```json
{
  "target": { "hindiShare": 0.6, "switchRate": 0.3, "matrixLanguage": "HI" },
  "promptFragment": "Reply in Hinglish, about 60% Hindi. Written in Roman script. Keep English for nouns like 'meeting' and 'payment'. At most two short sentences.",
  "borrowedWords": ["meeting", "payment"],
  "avoid": ["slang such as 'yaar' (register is neutral)"]
}
```
If `profile.confidence` is `low`, the response targets a balanced mix and says so in `promptFragment`.

## POST /api/v1/check (Should-tier)

Score a draft reply against a target.

Request:

```json
{
  "reply": "Aapka payment kal due hai. Aaj hi kar dijiye.",
  "target": { "hindiShare": 0.6, "switchRate": 0.3, "matrixLanguage": "HI" }
}
```

Response 200:

```json
{
  "replyProfile": { "...": "Profile of the reply" },
  "deltaHindiShare": 0.07,
  "deltaCmi": 4.2,
  "deltaSwitchRate": 0.05,
  "pass": true
}
```
`pass` is true when `deltaHindiShare <= 0.15`.

## Errors

```json
{ "error": { "code": "invalid_request", "message": "utterances must contain 1 to 10 strings" } }
```

| HTTP | code              | Meaning                                                                                               |
| ---- | ----------------- | ----------------------------------------------------------------------------------------------------- |
| 400  | `invalid_request` | Schema or length limit violated                                                                       |
| 413  | `too_large`       | Body over limit                                                                                       |
| 429  | `rate_limited`    | Too many requests; see `Retry-After`                                                                  |
| 500  | `internal`        | Unexpected error                                                                                      |
| 503  | `llm_unavailable` | Tag fallback unavailable; response still returned with unknown tokens tagged `X` and `degraded: true` |

## Rate limits (demo host, subject to change)

60 requests per minute per IP. Realtime sessions capped by seconds of speech (see `ARCHITECTURE.md` section 4).

## Realtime WebSocket (internal for v0)

`wss://<realtime-host>/ws/session`. Not part of the public API in v0. Event names are listed in `ARCHITECTURE.md` section 6.

## SDK sketch (Should-tier)

```ts
import { Sangam } from "@sangam/sdk";

const sangam = new Sangam({ baseUrl: "https://<host>" });

const { profile } = await sangam.profile({ utterances: history });
const guide = await sangam.guide({ profile, register: "neutral", outputScript: "roman" });

// Put guide.promptFragment into your LLM system prompt, then:
const check = await sangam.check({ reply, target: guide.target });
```

## Versioning

v0 is a draft. Breaking changes are allowed until after the contest. After that, `/api/v1` is frozen and changes go to `/api/v2`.
