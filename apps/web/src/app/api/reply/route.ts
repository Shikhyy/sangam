import { createProvider, type LlmProvider, LlmUnavailableError, monolingualGuidance } from "@sangam/llm";
import { parseReplyRequest } from "../../../lib/reply-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stream a reply as plain text.
 *
 * `mode: "typical"` answers in English only (the baseline agent). `mode: "sangam"` uses the
 * guidance the page worked out. The provider is the keyless mock unless SANGAM_MODE=live and a key is set.
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The request body must be valid JSON." }, { status: 400 });
  }

  const parsed = parseReplyRequest(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const { mode, history, guidance, targetHindiShare } = parsed.value;

  let provider: LlmProvider;
  try {
    provider = createProvider(process.env);
  } catch {
    return Response.json({ error: "The reply service is not configured." }, { status: 503 });
  }

  const replyRequest =
    mode === "typical"
      ? { history, guidance: monolingualGuidance("english"), targetHindiShare: 0, signal: request.signal }
      : { history, guidance, targetHindiShare, signal: request.signal };

  const encoder = new TextEncoder();
  const iterator = provider.reply(replyRequest)[Symbol.asyncIterator]();

  // Wait for the first words before answering, so a busy or failing model gives a clear error instead of a broken stream.
  let first: IteratorResult<string>;
  try {
    first = await iterator.next();
  } catch (error) {
    const busy = error instanceof LlmUnavailableError;
    return Response.json(
      { error: busy ? "The reply service is busy. Try again in a moment." : "Couldn't get a reply. Try again." },
      { status: busy ? 503 : 502 },
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let next = first;
        while (!next.done) {
          controller.enqueue(encoder.encode(next.value));
          next = await iterator.next();
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-sangam-provider": provider.name,
    },
  });
}
