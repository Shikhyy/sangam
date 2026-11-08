# Sangam: a voice agent that talks like you

One-page pitch for the Great Indian AI Internship Challenge · Live app: https://sangam-voice.vercel.app · Code: https://github.com/Shikhyy/sangam · Author: Shikhyy

**Problem.** People in India rarely speak one language. "yaar meeting kal hai but mujhe time nahi pata" is normal speech. Voice agents still answer in textbook Hindi or textbook English, so the reply sounds like a stranger.

**Who it is for.** Teams building Hindi and English voice agents (payment reminders, support, sales, appointments), and the callers who talk in a mix.

**Solution.** Sangam sits between the transcript and the reply and keeps the agent in the caller's own mix:

1. **Tag** every word as Hindi, English or neutral, in Roman or Devanagari script.
2. **Profile** the speaker: Hindi share, how often they switch, a style label. Recent sentences weigh more.
3. **Guide** any language model with a target mix and a few of the speaker's own words.
4. **Check** the draft reply against the mix. If it drifted, say which way and how to fix it.

It ships as a playground, a public JSON API (`profile`, `guide`, `check`) and a typed SDK.

**Gnani technology used.**

- **Prisma v3.0 speech-to-text** (`codemix`, `hi-IN,en-IN`): hears speech that mixes both languages in one transcript.
- **Timbre v3.0 text-to-speech** (voice Shivani, `hi-en`): speaks the Hinglish reply naturally.

Both run behind server routes with spend and rate limits, one request at a time.

**Proof it works.**

- Live app, public API, SDK, tests, and a 62 second demo video.
- Word tagging accuracy **96.7%** on 398 held-out words (69 sentences).
- Timbre turns text into audio in **0.83 s** (median of 10 clips). A sentence's Hindi share survives being spoken and heard again to within **1.8 points** on average.
- Every number, sample size and failure is on the results page: https://sangam-voice.vercel.app/results

**Honest limits.** The labelled sentences were written and labelled by an AI, with no second annotator. The speech test used 10 synthetic clips. The key experiment (do Sangam's replies match the speaker better than Hindi-only or English-only agents?) is built but unfinished, so no result is claimed. Replies use free language models. Synthetic data only; no real calls or personal data.

**Next.** Finish the mirror experiment, test on real recorded speech in noise, get people to rate the replies, and add more Indian languages.
