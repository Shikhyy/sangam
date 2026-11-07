import { healthOf } from "../../../lib/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** For uptime checks and for confirming a deploy picked up its settings. Never shows a key. */
export function GET(): Response {
  return Response.json(healthOf(process.env), { headers: { "cache-control": "no-store" } });
}
