import { check } from "@sangam/core";
import { apiError, gate, parseCheckBody, readJson } from "../../../../lib/api-v1";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Score a draft reply against the mix it should have. */
export async function POST(request: Request): Promise<Response> {
  const refused = gate(request);
  if (refused) return refused;

  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = parseCheckBody(body.value);
  if (!parsed.ok) return apiError("invalid_request", parsed.message, 400);

  const { reply, target, tolerance } = parsed.value;
  return Response.json(check(reply, target, tolerance === undefined ? {} : { tolerance }), {
    headers: { "cache-control": "no-store" },
  });
}
