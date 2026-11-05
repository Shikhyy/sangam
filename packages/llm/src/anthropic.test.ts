import { describe, expect, it } from "vitest";
import { AnthropicProvider, type ClientLike, DEFAULT_MODEL, FALLBACK_BETA, textDeltaOf } from "./anthropic";
import { type ChatTurn, LlmRefusalError, LlmRequestError } from "./types";

const delta = (text: string) => ({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text } });
const history: ChatTurn[] = [{ role: "user", text: "payment kab hai?" }];

interface FinalMessage {
  stop_reason: string | null;
  stop_details?: { category?: string | null } | null;
}

function fakeClient(events: unknown[], final: FinalMessage = { stop_reason: "end_turn" }) {
  const calls: { params: Record<string, unknown>; options?: { signal?: AbortSignal } }[] = [];
  const client: ClientLike = {
    beta: {
      messages: {
        stream(params, options) {
          calls.push({ params: params as Record<string, unknown>, options });
          return {
            async *[Symbol.asyncIterator]() {
              for (const event of events) yield event;
            },
            finalMessage: async () => final,
          };
        },
      },
    },
  };
  return { client, calls };
}

async function collect(iterable: AsyncIterable<string>): Promise<string> {
  let text = "";
  for await (const chunk of iterable) text += chunk;
  return text;
}

describe("AnthropicProvider: streaming", () => {
  it("yields text deltas and ignores other events", async () => {
    const { client } = fakeClient([
      { type: "message_start" },
      delta("Aapka "),
      { type: "content_block_delta", index: 0, delta: { type: "thinking_delta", thinking: "hmm" } },
      delta("payment"),
      { type: "message_stop" },
    ]);
    const provider = new AnthropicProvider({ client });
    expect(await collect(provider.reply({ history }))).toBe("Aapka payment");
  });

  it("has the name anthropic", () => {
    expect(new AnthropicProvider({ client: fakeClient([]).client }).name).toBe("anthropic");
  });
});

describe("AnthropicProvider: request", () => {
  it("sends the expected parameters by default", async () => {
    const { client, calls } = fakeClient([delta("ok")]);
    await collect(
      new AnthropicProvider({ client }).reply({ history, guidance: "Reply in Hinglish, about 60% Hindi." }),
    );

    const params = calls[0]?.params;
    expect(params).toMatchObject({
      model: DEFAULT_MODEL,
      max_tokens: 4096,
      output_config: { effort: "low" },
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      messages: [{ role: "user", content: "payment kab hai?" }],
    });
    expect(String(params?.system)).toContain("Reply in Hinglish, about 60% Hindi.");
  });

  it("sends no parameters that the model rejects", async () => {
    const { client, calls } = fakeClient([delta("ok")]);
    await collect(new AnthropicProvider({ client }).reply({ history }));
    const keys = Object.keys(calls[0]?.params ?? {});
    for (const rejected of ["thinking", "temperature", "top_p", "top_k", "tool_choice"]) {
      expect(keys).not.toContain(rejected);
    }
  });

  it("honours custom model, effort and token limit", async () => {
    const { client, calls } = fakeClient([delta("ok")]);
    await collect(
      new AnthropicProvider({ client, model: "claude-haiku-5-5", effort: "high", maxTokens: 900 }).reply({ history }),
    );
    expect(calls[0]?.params).toMatchObject({
      model: "claude-haiku-5-5",
      max_tokens: 900,
      output_config: { effort: "high" },
    });
  });

  it("can turn the refusal fallback off", async () => {
    const { client, calls } = fakeClient([delta("ok")]);
    await collect(new AnthropicProvider({ client, refusalFallback: false }).reply({ history }));
    expect(calls[0]?.params).not.toHaveProperty("betas");
    expect(calls[0]?.params).not.toHaveProperty("fallbacks");
  });

  it("passes the abort signal through", async () => {
    const { client, calls } = fakeClient([delta("ok")]);
    const controller = new AbortController();
    await collect(new AnthropicProvider({ client }).reply({ history, signal: controller.signal }));
    expect(calls[0]?.options?.signal).toBe(controller.signal);
  });

  it("validates the history before calling the API", async () => {
    const { client, calls } = fakeClient([delta("ok")]);
    await expect(collect(new AnthropicProvider({ client }).reply({ history: [] }))).rejects.toBeInstanceOf(
      LlmRequestError,
    );
    expect(calls).toHaveLength(0);
  });
});

describe("AnthropicProvider: refusals", () => {
  it("throws LlmRefusalError with the category when the model declines", async () => {
    const { client } = fakeClient([delta("I can't")], { stop_reason: "refusal", stop_details: { category: "cyber" } });
    const provider = new AnthropicProvider({ client });

    const chunks: string[] = [];
    let error: unknown;
    try {
      for await (const chunk of provider.reply({ history })) chunks.push(chunk);
    } catch (caught) {
      error = caught;
    }

    expect(chunks).toEqual(["I can't"]);
    expect(error).toBeInstanceOf(LlmRefusalError);
    expect((error as LlmRefusalError).category).toBe("cyber");
  });

  it("handles a refusal with no category", async () => {
    const { client } = fakeClient([], { stop_reason: "refusal", stop_details: null });
    await expect(collect(new AnthropicProvider({ client }).reply({ history }))).rejects.toMatchObject({
      name: "LlmRefusalError",
      category: null,
    });
  });
});

describe("textDeltaOf", () => {
  it("extracts text from a text delta", () => {
    expect(textDeltaOf(delta("hello"))).toBe("hello");
  });

  it("returns null for anything else", () => {
    expect(textDeltaOf(null)).toBeNull();
    expect(textDeltaOf("text")).toBeNull();
    expect(textDeltaOf({ type: "message_start" })).toBeNull();
    expect(textDeltaOf({ type: "content_block_delta", delta: { type: "thinking_delta", thinking: "x" } })).toBeNull();
    expect(textDeltaOf({ type: "content_block_delta", delta: { type: "text_delta", text: 5 } })).toBeNull();
  });
});
