import { guide } from "@sangam/core";
import { apiError, gate, parseGuideBody, readJson } from "../../../../lib/api-v1";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Turn a profile into guidance for the next reply: a target mix and a sentence to put in your prompt. */
export async function POST(request: Request): Promise<Response> {
  const refused = gate(request);
  if (refused) return refused;

  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = parseGuideBody(body.value);
  if (!parsed.ok) return apiError("invalid_request", parsed.message, 400);

  return Response.json(guide(parsed.value), { headers: { "cache-control": "no-store" } });
}
