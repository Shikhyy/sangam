# Gnani notes

Everything under "Provisional" came from web research on 5 to 6 Nov and has NOT been verified against the live docs or a real call. Replace each item with what you actually observe, with the date.

## Provisional (verify)

- Base URL: `api.vachana.ai`. Auth header: `X-API-Key-ID`.
- STT: Prisma v2.5 (specified language) and v3.0 (multilingual, auto-detect). REST for audio up to 30 seconds, WebSocket for streaming, batch for long files. About 200 ms P95 claimed.
- TTS: Timbre v2.5 and v3.0. REST, SSE and WebSocket streaming. Voices listed on a model card: Pranav, Kaveri, Shubhra, Deepak. v3.0 reportedly supports inline audio tags (pauses, laughter). Sources disagree about SSML.
- Languages: 10 Indian languages plus English and Hinglish. Sources disagree on the exact count.
- Voice cloning: mentioned in passing, details unclear. Not used in this project.
- Evon v3.3: open weights by request on Hugging Face. Not on the hosted API. Needs a large GPU.
- Pipecat and LiveKit plugins exist.
- Contest credits: 5,000 per registration.

## Verified (live calls and the official docs, 6 Nov 2026)

| Question                                                         | Answer                                                                                                                                                                                                                       | Date       |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Credits visible and amount                                       | Not checked; the dashboard at app.gnani.ai shows them.                                                                                                                                                                       |            |
| Cost per minute of STT                                           | Not checked.                                                                                                                                                                                                                 |            |
| Cost per 1,000 characters of TTS                                 | Not checked.                                                                                                                                                                                                                 |            |
| STT REST path and parameters                                     | `POST https://api.vachana.ai/stt/v3`, multipart: `audio_file`, `model` (`prisma-v3.0`), `language_code`, `format`. Header `X-API-Key-ID`. Up to 30 s; WAV, MP3, OGG, FLAC, AAC, M4A.                                         | 6 Nov 2026 |
| STT WebSocket path, handshake, audio format and sample rate      | Not used. The app records a clip, converts it to 16 kHz mono WAV in the browser and uses REST.                                                                                                                               |            |
| Language code for Hinglish                                       | STT: send `hi-IN,en-IN` (v3.0 takes 1 to 4 codes, or `indic-auto`). TTS: `hi-en`.                                                                                                                                            | 6 Nov 2026 |
| What script does Hinglish output use (Roman, Devanagari, mixed)? | With `format=codemix`: mixed. Hindi words in Devanagari, English words in Latin. A live round trip returned "आपका payment due है, please आज ही कर दीजिए।". `format=transliterate` gives all-Roman.                            | 6 Nov 2026 |
| Prisma v2.5 versus v3.0 differences observed                     | v3.0 is the one that accepts several languages and the `codemix` and `transliterate` formats, so it is the one used. v2.5 was not compared.                                                                                  | 6 Nov 2026 |
| TTS path and parameters; Roman versus Devanagari input quality   | `POST /api/v1/tts/inference`, JSON: `text`, `model` (`timbre-v3.0`), `voice`, `language`, `speed`, `audio_config`. Returns the audio. Roman Hinglish input was accepted with `hi-en`. Devanagari input quality not compared. | 6 Nov 2026 |
| Available voices and languages                                   | Timbre v3.0 has 13 voices and every one speaks all 10 languages. Used: Shivani (warm, patient). Others include Avinash and Prakash (professional, for collections).                                                          | 6 Nov 2026 |
| TTS streaming mode that works best                               | Not compared. REST returns the whole clip (about 1.2 s for 2.6 s of speech); SSE streaming exists and is lower latency.                                                                                                      | 6 Nov 2026 |
| Rate limits and error codes                                      | An account may allow one active request at a time (429 `RATE_LIMITED`), so the server queues calls. 401 bad key, 402 no credit, 403 key lacks the service.                                                                   | 6 Nov 2026 |
| Anything surprising                                              | The summariser tool refused the STT page, so the raw markdown was fetched instead.                                                                                                                                           | 6 Nov 2026 |

Observed live: TTS of "Aapka payment due hai, please aaj hi kar dijiye." took about 1.2 s and gave a 2.6 s WAV; transcribing that audio took about 0.5 s and was judged `hi-IN`.

## What failed or surprised me (feeds the write-up)

-
