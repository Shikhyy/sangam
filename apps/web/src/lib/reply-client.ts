import type { Turn } from "./history";

export interface ReplyBody {
  mode: "typical" | "sangam";
  history: Turn[];
  guidance?: string;
  targetHindiShare?: number;
}

/** Ask /api/reply for a reply and report the text as it streams in. */
export async function requestReply(
  body: ReplyBody,
  onText: (text: string) => void,
): Promise<{ text: string; provider: string }> {
  const response = await fetch("/api/reply", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = "Couldn't get a reply. Try again.";
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // keep the generic message
    }
    throw new Error(message);
  }

  const provider = response.headers.get("x-sangam-provider") ?? "mock";
  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    onText(text);
    return { text, provider };
  }

  const decoder = new TextDecoder();
  let text = "";
  let chunk = await reader.read();
  while (!chunk.done) {
    text += decoder.decode(chunk.value, { stream: true });
    onText(text);
    chunk = await reader.read();
  }
  text += decoder.decode();
  onText(text);
  return { text, provider };
}
