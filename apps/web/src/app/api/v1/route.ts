export const dynamic = "force-dynamic";

/** What the API is and where its endpoints are. Needs no key. */
export function GET(): Response {
  return Response.json(
    {
      name: "Sangam API",
      version: "v1",
      description: "Measure how someone mixes Hindi and English, and keep an agent's replies in the same mix.",
      endpoints: [
        { method: "POST", path: "/api/v1/profile", does: "Measure how someone mixes" },
        { method: "POST", path: "/api/v1/guide", does: "Guidance for the next reply" },
        { method: "POST", path: "/api/v1/check", does: "Score a draft reply" },
      ],
      docs: "/docs",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
