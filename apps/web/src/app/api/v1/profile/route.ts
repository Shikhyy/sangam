import { buildProfile, tag } from "@sangam/core";
import { apiError, gate, parseProfileBody, readJson } from "../../../../lib/api-v1";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Measure how someone mixes Hindi and English across their recent utterances. */
export async function POST(request: Request): Promise<Response> {
  const refused = gate(request);
  if (refused) return refused;

  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = parseProfileBody(body.value);
  if (!parsed.ok) return apiError("invalid_request", parsed.message, 400);

  const tokens = parsed.value.utterances.map((utterance) => tag(utterance));
  const profile = buildProfile(tokens, parsed.value.decay === undefined ? {} : { decay: parsed.value.decay });
  return Response.json({ tokens, profile }, { headers: { "cache-control": "no-store" } });
}
