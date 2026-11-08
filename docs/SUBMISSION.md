# Submission pack

Deadline: **Tue 10 Nov 2026, 11:59 PM IST.** Aim to submit by the afternoon of the 10th. Re-read the contest page before submitting, because the terms may have changed. Everything in this file is a draft for you to check and post yourself.

## Status

| Item                                      | State                                                                                                                                                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Working app, live                         | Done: https://sangam-voice.vercel.app                                                                                                                                                                                          |
| Public code                               | Done: https://github.com/Shikhyy/sangam (public, MIT)                                                                                                                                                                          |
| Written project explanation               | Draft below. Add your name and check every claim                                                                                                                                                                               |
| Demo video                                | **Recorded** on 8 Nov: `demo/out/sangam-demo.mp4`, 62 s, with live replies from the free models and the real Gnani Timbre voice. **Watch it all the way through before you post it**, then upload it publicly and add the link |
| Nominated post, LinkedIn and/or X         | Draft below. **You post it**, with the two hashtags, before submitting                                                                                                                                                         |
| Eligibility (Indian college, 18 or older) | **You confirm**                                                                                                                                                                                                                |
| Keys rotated                              | **You do this.** The OpenRouter and Gnani keys were printed earlier in a chat                                                                                                                                                  |
| Microphone tested on a real phone         | **Not done.** Do it on the live site before you record or post                                                                                                                                                                 |

## Project explanation (paste into the form)

**Title.** Sangam: a voice agent that talks like you

**One line.** Sangam measures how a person mixes Hindi and English and keeps a voice agent's replies in the same mix.

**Problem.** People in India rarely speak one language. "yaar meeting kal hai but mujhe time nahi pata" is normal speech. Voice agents still answer in textbook Hindi or textbook English, so the reply feels like a stranger. A voice agent that mirrors the way you speak feels more comfortable and is easier to understand.

**Who it is for.** Teams building Hindi and English voice agents (support, payment reminders, sales, appointments), and anyone who wants to see how they mix the two languages through the "What's your Hinglish?" card.

**What it does.** It tags every word as Hindi, English or neutral, builds a profile of how the person speaks (Hindi share, switch rate, style), turns it into guidance for the language model, and checks the draft reply against the person's mix. When a draft drifts it says which way and how to fix it. It is available as a playground, a public JSON API (`profile`, `guide`, `check`) and a typed SDK.

**Gnani models and APIs used.**

- **Prisma v3.0 speech-to-text, `codemix` format**, with `hi-IN,en-IN` set, so speech that mixes Hindi and English comes back in one transcript (Hindi in Devanagari, English in Latin script, which Sangam reads directly). Used when you press the microphone in the playground.
- **Timbre v3.0 text-to-speech, voice Shivani, language `hi-en`**, so one voice speaks a Hinglish reply naturally. Used when you press play on a reply.
- Both go through server routes with a one-request-at-a-time queue and spend limits, as Gnani's API allows one active request.

**What is measured.** Tagging accuracy is 96.7% on 398 words in 69 held-out sentences. Gnani Timbre turns text into audio in a median of 0.83 s over 10 clips, and the speaker's Hindi share survives a speak-and-hear round trip to within 1.8 points on average. The results page ([/results](https://sangam-voice.vercel.app/results)) shows the numbers with their sample sizes and what is weak.

**Honest limits.** The labelled sentences were written and labelled by an AI, and no second human has labelled them. The speech test used ten synthetic clips. The mirror experiment (do Sangam replies sit closer to the speaker's mix than Hindi-only or English-only replies?) is built but not finished, because the free model quota ran out, and no result is claimed. Replies use free language models only.

**How AI was used.** The project was built with Claude Code as a coding assistant, with the author directing the design and decisions. The replies in the live app come from free language models through OpenRouter, and speech comes from Gnani.

**Contribution.** [Your name]: [what you did. If you worked alone, say so.] Do not copy this line without filling it in.

**Data.** Synthetic data only. No recorded calls, no personal data, no stored audio.

**Links.** Live app https://sangam-voice.vercel.app · Code https://github.com/Shikhyy/sangam · Results https://sangam-voice.vercel.app/results · Demo video [add the public link].

## Posts

Post on the platform(s) you nominate, live before you submit. Include **#GnaniAI** and **#GreatIndianAIInternshipChallenge**. Tagging Gnani alone does not count. Engagement must be genuine: no bots, swaps, paid promotion or asking friends to trade likes. Say what is true; do not claim users prefer it, because that has not been tested.

### X (about 270 characters with the link counted as 23)

```
Voice agents talk like textbooks. You don't.

Sangam measures how you really mix Hindi and English, then replies in your mix. Gnani Prisma listens, Timbre speaks.

What's your Hinglish? https://sangam-voice.vercel.app/card

#GnaniAI #GreatIndianAIInternshipChallenge
```

Attach the demo video. Reply to your own post with the repo link and the results page.

### LinkedIn

```
Voice agents talk like textbooks. Most of us don't.

"yaar meeting kal hai but mujhe time nahi pata" is how millions of people really speak, and voice agents answer in textbook Hindi or textbook English. So I built Sangam: a voice agent that talks like you.

It tags every word as Hindi or English, measures how you mix them, and keeps the agent's replies in the same mix. Gnani Prisma listens to code-mixed speech and Gnani Timbre speaks the reply back.

What I measured, with the limits:
- 96.7% word tagging accuracy on 398 held-out words (labelled by an AI, no second human yet)
- Gnani Timbre turns text into audio in 0.83 s median (10 synthetic clips)
- The key experiment, do the replies match the speaker better than a Hindi-only or English-only agent, is built but not finished, so I am not claiming a result

It is also a small API and an SDK, so any voice agent can use it.

Try your own Hinglish and get your card: https://sangam-voice.vercel.app/card
Code: https://github.com/Shikhyy/sangam

What's your Hinglish? Reply with a sentence and I'll tell you how you mix.

#GnaniAI #GreatIndianAIInternshipChallenge
```

### Schedule

| When              | What                                                                                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sat 7 Nov         | Test the microphone on your phone. Rotate the keys. Optional teaser: "Send me one sentence in your normal Hinglish and I'll tell you how you mix."   |
| Sun 8 Nov (today) | Watch the demo video, upload it publicly, and test the microphone on your phone. Run `pnpm eval:mirror` to finish the experiment if the models allow |
| Mon 9 Nov         | Publish the main post (the one you nominate) with the video. Reply to people who send a sentence                                                     |
| Tue 10 Nov        | Thank-you reply with the results page. Check every link, then submit by the afternoon                                                                |

## How the final video was made (and how to redo it)

The video was recorded on 8 Nov against the live models. The voice-over is Microsoft Edge text to speech (`en-IN-NeerjaNeural`), and the reply you hear spoken is Gnani Timbre reading the real reply. Say so if asked. To redo it:

The pipeline is in [`demo/`](../demo/README.md). It drives the real app in headless Chrome, mixes an Indian-English Edge TTS voice-over with the Gnani Timbre voice speaking the real reply, and burns in captions. A rehearsal with scripted replies has been run to prove it works; **a rehearsal is never to be submitted**, and the script refuses to make a final take unless the app is live.

```bash
pnpm --filter @sangam/web build
cd apps/web && SANGAM_MODE=live node ./scripts/next.mjs start -p 3300 &   # leave it running
node demo/voice.mjs                       # the voice-over (needs internet)
ANGLE=metal node demo/record.mjs          # needs the free models to answer
node demo/build.mjs                       # demo/out/sangam-demo.mp4
```

If `record.mjs` says "No replies after several tries", the free models are busy: try again later. The finished file is in `demo/out/` and is not committed to git (it is large). Upload it publicly (for example on YouTube or directly in the post), and add the link above.

## Before you press submit

- [ ] Keys rotated in OpenRouter and Gnani, and updated in Vercel
- [ ] `curl https://sangam-voice.vercel.app/api/health` shows `"mode":"live"`
- [ ] Microphone works on your phone over HTTPS, in Hindi, English and a mix
- [ ] The playground badge says "live", and Get replies returns two real replies
- [ ] Demo video is public and plays without signing in
- [ ] The post is live, with both hashtags and the video, on each platform you nominate
- [ ] Your name and contribution are filled in above
- [ ] You meet the eligibility rules
- [ ] The contest page terms have not changed
