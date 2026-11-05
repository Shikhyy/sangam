# Content, demo and posting plan

Engagement is the first selection gate, so this is part of the product. All engagement must be genuine: no bots, swaps, paid promotion or purchased reactions.

## 1. Core story

> Voice assistants talk to you like a textbook. Real people don't. Sangam measures how you mix Hindi and English, and answers in your own mix.

Three layers of message, in this order: a consumer hook (What's your Hinglish?), a clear demo (three speakers, three replies), then the developer story (it's an API anyone can add to a voice agent).

## 2. Demo video storyboard (45 to 60 seconds, captions on)

| Time         | Visual                                                                                | Voice or caption                                  |
| ------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 0:00 to 0:05 | Phone ringing; a stiff agent speaks pure formal Hindi                                 | "Why do voice agents talk like textbooks?"        |
| 0:05 to 0:12 | Split screen appears: stiff on the left, Sangam on the right                          | "Same question. Three people."                    |
| 0:12 to 0:22 | Speaker A (Hindi-base, English nouns). Ribbon fills. Sangam replies in a matching mix | The meter needles converge                        |
| 0:22 to 0:32 | Speaker B (English-base, Hindi seasoning). Different reply                            |                                                   |
| 0:32 to 0:40 | Speaker C (mid-sentence switcher). Different reply again                              |                                                   |
| 0:40 to 0:48 | Hero chart: mirror error for three agent styles, with n shown                         | "Measured, not claimed"                           |
| 0:48 to 0:55 | The "Copy code" button, then the card                                                 | "An API for any voice agent. And a card for you." |
| 0:55 to 1:00 | URL, repo, hashtags                                                                   | "What's your Hinglish?"                           |

Rules: show real UI, not mock-ups. Show the mock/live badge honestly. Label small-sample results. If something was recorded in mock mode, say so.

Recording tips: record voice in a quiet room, have a backup take, subtitle every line, keep the first 3 seconds visually strong.

## 3. Posting schedule

| When               | Post                                                                                                                                               | Goal                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Fri 6 Nov, tonight | Teaser: "Record 20 seconds about your day in your normal Hinglish. I'll tell you how you mix." Ask people to reply with a voice note or a sentence | Build an audience and collect consented samples |
| Sun 8 Nov          | 20-second preview of the ribbon and meter                                                                                                          | Momentum                                        |
| Mon 9 Nov          | **Main post** (the one you nominate): story, demo video, hero chart, try-it link, repo                                                             | The engagement stage                            |
| Tue 10 Nov         | Thank-you and a short results thread                                                                                                               | Keep it alive                                   |

Both LinkedIn and X. Include `#GnaniAI` and `#GreatIndianAIInternshipChallenge`. Tagging Gnani alone does not count. Posts must be live before you submit.

## 4. Main post skeleton (adapt to your voice)

1. Hook line (the textbook problem).
2. One sentence on what Sangam does.
3. The three-speaker demo video.
4. One honest number from the evaluation, with the sample size.
5. What it is for developers (one line) and how to try it (link).
6. A question that invites replies: "What's your Hinglish? Reply with a sentence and I'll tell you."
7. Hashtags.

Do not overclaim. Say "in a test with N people" and not "users prefer".

## 5. "What's your Hinglish?" card copy

- Headline: the type (for example "Mid-Sentence Switcher").
- Three stats: Hindi share, switch rate, signature words.
- A mini ribbon of the user's own sentence.
- One light line of description.
- A note: "Made from your voice. Audio isn't stored."

Keep it playful. Do not infer region, class, age, or background.

## 6. Contest write-up outline

1. **Title and one-liner.**
2. **Problem:** agents sound stiff because they ignore how people mix languages; evidence from the CoNLL 2020 study (cite) and Gnani's own stated pain points.
3. **Users:** people who mix languages in daily speech; teams building Hinglish voice agents.
4. **What it does:** the profile, guidance and check loop, with a screenshot.
5. **Gnani models and APIs used:** Prisma (which mode and model version, why), Timbre (voice, script, streaming), and anything else. Be specific. Say what was mocked, if anything.
6. **How it works:** a short architecture diagram and the metric definitions.
7. **Evaluation:** tagger accuracy, mirror error, A/B, latency, cost. Include failures.
8. **Limits and ethics:** small samples, Hindi and English only, no audio stored, no stereotyping.
9. **What's next:** accounts, streaming API, more language pairs, trained language ID, self-hosting.
10. **My contribution** (required): everything, if solo. Be accurate about what AI tools helped with.
11. **Links:** demo, repo, video, nominated posts.

## 7. Interview preparation

Be ready to explain, with numbers from your own evaluation:

- Why a layer and not a model.
- How the tagger works and where it fails (the top error types).
- Why the metrics are deterministic and why the LLM only writes replies.
- What the CoNLL 2020 paper found and what you added.
- How you handled Prisma's output script and what you measured.
- Latency by stage, and what you'd do to reduce it.
- Cost per minute and what the credits supported.
- What you would build in the first month with Gnani's resources, for example Evon for 11 Indian languages, a trained language-ID model, or the Pipecat processor.
- What you tried that didn't work. Keep a running list from Day 0.
- Who would pay, and what you learned from the two or three conversations.

## 8. Things not to do

- Do not claim Sangam improves business outcomes.
- Do not show real people's voices without consent.
- Do not post API keys, even partially, in screenshots.
- Do not describe mocked features as live.
- Do not use real call recordings, phone numbers or ID numbers.
