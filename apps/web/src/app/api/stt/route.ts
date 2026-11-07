import { createSpeech, SpeechError } from "@sangam/speech";
import { callerOf, createRateLimiter } from "../../../lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 30 seconds of 16 kHz mono WAV is about 1 MB, so this leaves room without accepting anything huge. */
const MAX_BYTES = 3 * 1024 * 1024;
const allow = createRateLimiter(20, 60_000);

/** Tell the page whether Gnani speech is set up, so it knows whether to use it or the browser's own. */
export function GET(): Response {
  return Response.json(
    { configured: createSpeech(process.env) !== null },
    { headers: { "cache-control": "no-store" } },
  );
}

/** Turn a recorded clip into text with Gnani. The key stays on the server. */
export async function POST(request: Request): Promise<Response> {
  const speech = createSpeech(process.env);
  if (!speech) {
    return Response.json(
      { error: "Speech input is not set up on this server.", code: "not_configured" },
      { status: 503 },
    );
  }
  if (!allow(callerOf(request))) {
    return Response.json({ error: "Too many recordings in a minute. Wait a moment." }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Send the recording as a form upload." }, { status: 400 });
  }

  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return Response.json({ error: "No recording was sent." }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return Response.json({ error: "That recording is too long. Keep it under 30 seconds." }, { status: 413 });
  }

  try {
    const result = await speech.transcribe(audio, "speech.wav");
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof SpeechError) {
      const status = error.status === 429 ? 429 : error.status === 400 || error.status === 422 ? 400 : 502;
      return Response.json({ error: error.message }, { status });
    }
    return Response.json({ error: "Speech input failed. Try again." }, { status: 502 });
  }
}
