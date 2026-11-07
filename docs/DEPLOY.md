# Deploying Sangam

Sangam is a Next.js app in `apps/web`. The simplest host is Vercel: import the repository once, and every merge to `main` deploys by itself. This takes about five minutes and needs no command-line tools.

## 1. Import the repository

1. Sign in to [vercel.com](https://vercel.com) with GitHub.
2. **Add New**, then **Project**, then import `Shikhyy/sangam`.
3. Set **Root Directory** to `apps/web`. Leave **Include source files outside of the Root Directory** switched on (it is by default), because the app uses the packages in `packages/`.
4. Leave the framework as **Next.js** and the build and install commands on their defaults. Vercel reads the pnpm version from `package.json`.
5. Add the settings below, then press **Deploy**.

`apps/web/vercel.json` already picks the Mumbai region (`bom1`), which is closest to Gnani and to most users.

## 2. Settings

Add these under **Settings, Environment Variables**, for Production. The two keys are the only secrets: mark them **Sensitive** and never put them in git, in chat or in a pull request.

| Name                   | Value                                                               | Secret  |
| ---------------------- | ------------------------------------------------------------------- | ------- |
| `SANGAM_MODE`          | `mock` for the first deploy, then `live` once the keys are in       | no      |
| `OPENROUTER_API_KEY`   | your OpenRouter key (it starts with `sk-or-`)                       | **yes** |
| `GNANI_API_KEY`        | your Gnani key                                                      | **yes** |
| `GNANI_STT_MODEL`      | `prisma-v3.0`                                                       | no      |
| `GNANI_TTS_MODEL`      | `timbre-v3.0`                                                       | no      |
| `GNANI_TTS_VOICE`      | `Shivani`                                                           | no      |
| `GNANI_STT_LANGUAGES`  | `hi-IN,en-IN`                                                       | no      |
| `GNANI_STT_FORMAT`     | `codemix`                                                           | no      |
| `GNANI_TTS_LANGUAGE`   | `hi-en`                                                             | no      |
| `NEXT_PUBLIC_SITE_URL` | the site's public address, for example `https://sangam.example.com` | no      |

Optional: `SANGAM_API_KEYS` (comma separated, switches on keys for the public API) and the spend and rate limits listed in `.env.example`. Leave them blank to use the safe defaults.

`NEXT_PUBLIC_SITE_URL` is baked in at build time. After the first deploy gives you an address, set it and **redeploy**, or share previews will point at the wrong place.

**Rotate any key that has been pasted anywhere public or semi-public before you add it here.**

## 3. Check the deploy

Replace `YOUR_SITE` with the address.

```bash
curl -s https://YOUR_SITE/api/health
```

You should see:

- `"mode": "mock"` and `"reply": "mock"` on the first deploy, or `"mode": "live"` and `"reply": "openrouter"` once the keys are set.
- `"speech": true` once `GNANI_API_KEY` is set.
- `"reply": "misconfigured"` means live mode is on but no usable reply key is set. Fix the settings and redeploy.

Then, in a browser:

1. Open the home page and the playground, press **Get replies**, and check both replies appear.
2. Press **Play** on a reply (it should be a Gnani voice) and use the **microphone** (it needs the site to be on `https`, which Vercel provides). This is the one path that has only been tested with generated audio so far.
3. Open `/card?t=yaar%20meeting%20kal%20hai`, copy the link and paste it into a chat to see the preview image.
4. Open `/docs` and press the try-it button.

```bash
curl -s -X POST https://YOUR_SITE/api/v1/profile \
  -H "content-type: application/json" \
  -d '{"utterances": ["yaar meeting kal hai but mujhe time nahi pata"]}'
```

## 4. Spend and limits on a host

The guards (speech seconds, reply requests, rate limits) count in memory inside one server process. A host like Vercel may run several instances, and each counts for itself, so the real total across instances can be higher than the cap you set. Treat the caps as a safety net and set them low:

- Keep `SANGAM_DAILY_SPEECH_CAP_SEC` and `SANGAM_REPLY_DAILY_CAP` modest.
- Watch your Gnani credits and your OpenRouter usage for the first days.
- To stop spending at once, remove the two keys in Vercel and redeploy, or set `SANGAM_MODE` back to `mock`. Replies then come from the scripted mock and speech falls back to the browser's own voice.

A shared store (for example Redis) would make the caps exact across instances. That is not built yet.

## 5. If something is wrong

| Symptom                                               | Likely cause                                                                                       |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Build fails with a module not found for `@sangam/...` | Root Directory is not `apps/web`, or **Include source files outside of the Root Directory** is off |
| `/api/health` says `misconfigured`                    | `SANGAM_MODE=live` with no `OPENROUTER_API_KEY` (or `ANTHROPIC_API_KEY`)                           |
| Speech buttons use the browser voice                  | `GNANI_API_KEY` is not set, or `/api/health` shows `"speech": false`                               |
| Microphone does nothing                               | The page is not on `https`, or the browser blocked it. Check the site permissions                  |
| Shared links show a blank preview                     | `NEXT_PUBLIC_SITE_URL` is not set to the real address, or you have not redeployed since setting it |
| Replies say "busy" often                              | The free OpenRouter models are rate limited. Wait, or add credits to your OpenRouter account       |
