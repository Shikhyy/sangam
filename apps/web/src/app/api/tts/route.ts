import { createSpeech, SpeechError } from "@sangam/speech";
import { estimateSpeechSeconds, getGuards, refusal, SPOKEN_BYTES_PER_SECOND } from "../../../lib/guards";
import { callerOf } from "../../../lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CHARS = 500;

/** Turn a reply into spoken audio with Gnani. The key stays on the server. */
export async function POST(request: Request): Promise<Response> {
  const speech = createSpeech(process.env);
  if (!speech) {
    return Response.json(
      { error: "Speech output is not set up on this server.", code: "not_configured" },
      { status: 503 },
    );
  }

  const guards = getGuards();
  const caller = callerOf(request);
  if (!guards.speech.perMinute(caller)) {
    return refusal({ ok: false, message: "Too many plays in a minute. Wait a moment.", retryAfterSec: 30 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The request body must be valid JSON." }, { status: 400 });
  }
  const raw = (body as { text?: unknown } | null)?.text;
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) return Response.json({ error: "There is no text to speak." }, { status: 400 });
  if (text.length > MAX_CHARS) {
    return Response.json({ error: `Keep the text under ${MAX_CHARS} characters.` }, { status: 400 });
  }

  // Set the seconds aside before spending anything, then settle with the length of the audio that came back.
  const reservation = guards.speech.budget.reserve(caller, estimateSpeechSeconds(text.length));
  if (!reservation.ok) return refusal(reservation);

  try {
    const { audio, contentType } = await speech.synthesize(text);
    reservation.commit(audio.byteLength / SPOKEN_BYTES_PER_SECOND);
    return new Response(audio, { headers: { "content-type": contentType, "cache-control": "no-store" } });
  } catch (error) {
    reservation.release();
    if (error instanceof SpeechError) {
      const status = error.status === 429 ? 429 : error.status === 400 || error.status === 422 ? 400 : 502;
      return Response.json({ error: error.message }, { status });
    }
    return Response.json({ error: "Speech output failed. Try again." }, { status: 502 });
  }
}
