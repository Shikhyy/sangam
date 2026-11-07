# Demo video pipeline

Makes the 60 second demo video from the real app. Nothing here is a mock-up: the screen is the running site, the reply text comes from the live language models, and the voice you hear speaking the reply is Gnani Timbre.

| File             | What it does                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `narration.json` | The voice-over script and the Edge TTS voice (`en-IN-NeerjaNeural`)                       |
| `voice.mjs`      | Makes the voice-over with `edge-tts` and measures each clip                               |
| `record.mjs`     | Drives the app in headless Chrome and saves the frames, the reply text and the Gnani clip |
| `captions.py`    | Draws the caption images (Pillow)                                                         |
| `build.mjs`      | Mixes everything into `out/sangam-demo.mp4` with `ffmpeg`                                 |

Needs: Chrome, `ffmpeg`, `edge-tts` (`pip install edge-tts`) and Python with Pillow. Intermediate files go to `work/` and the video to `out/`, and neither is committed.

```bash
node demo/voice.mjs
SANGAM_MODE=live node apps/web/scripts/next.mjs start -p 3300      # in another terminal, after building
ANGLE=metal node demo/record.mjs                                    # final take: needs live replies
node demo/build.mjs
```

`record.mjs --rehearsal` tests the pipeline against the scripted mock replies and writes `sangam-demo-rehearsal.mp4`. **Never submit a rehearsal.** Without `--rehearsal`, the script refuses to record when the app is in mock mode.

Waiting for the model is cut out of the video with a jump cut, so a slow reply does not leave dead air. The narration is read by Microsoft Edge text to speech, which sends the narration text to Microsoft's service when it runs.
