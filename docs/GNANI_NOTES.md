# Gnani notes (fill in on Day 1)

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

## Verified (fill in)

| Question                                                         | Answer | Date |
| ---------------------------------------------------------------- | ------ | ---- |
| Credits visible and amount                                       |        |      |
| Cost per minute of STT                                           |        |      |
| Cost per 1,000 characters of TTS                                 |        |      |
| STT REST path and parameters                                     |        |      |
| STT WebSocket path, handshake, audio format and sample rate      |        |      |
| Language code for Hinglish                                       |        |      |
| What script does Hinglish output use (Roman, Devanagari, mixed)? |        |      |
| Prisma v2.5 versus v3.0 differences observed                     |        |      |
| TTS path and parameters; Roman versus Devanagari input quality   |        |      |
| Available voices and languages                                   |        |      |
| TTS streaming mode that works best                               |        |      |
| Rate limits and error codes                                      |        |      |
| Anything surprising                                              |        |      |

## What failed or surprised me (feeds the write-up)

-
