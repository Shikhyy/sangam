import { describe, expect, it } from "vitest";
import { FREE_MODELS, isFreeModel, OpenRouterProvider, textOfLine } from "./openrouter";
import { LlmUnavailableError } from "./types";

const encoder = new TextEncoder();

function sse(lines: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(`${line}\n`));
      controller.close();
    },
  });
  return new Response(body, { status: 200 });
}

const chunk = (content: string) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}`;

async function collect(stream: AsyncIterable<string>): Promise<string> {
  let text = "";
  for await (const part of stream) text += part;
  return text;
}

const request = { history: [{ role: "user" as const, text: "kal meeting hai" }] };

describe("isFreeModel", () => {
  it("accepts :free models and the free router, and nothing else", () => {
    expect(isFreeModel("google/gemma-4-31b-it:free")).toBe(true);
    expect(isFreeModel("openrouter/free")).toBe(true);
    expect(isFreeModel("anthropic/claude-opus-5.5")).toBe(false);
    expect(isFreeModel("openrouter/auto")).toBe(false);
  });

  it("only ships free models by default", () => {
    expect(FREE_MODELS.every(isFreeModel)).toBe(true);
  });
});

describe("textOfLine", () => {
  it("reads text from a data line", () => {
    expect(textOfLine(chunk("Aapka"))).toBe("Aapka");
  });

  it("ignores comments, blank lines, [DONE] and other lines", () => {
    expect(textOfLine(": OPENROUTER PROCESSING")).toBeNull();
    expect(textOfLine("")).toBeNull();
    expect(textOfLine("data: [DONE]")).toBeNull();
    expect(textOfLine("event: ping")).toBeNull();
    expect(textOfLine("data: not json")).toBeNull();
  });

  it("raises an error sent inside the stream", () => {
    expect(() => textOfLine(`data: ${JSON.stringify({ error: { message: "busy" } })}`)).toThrow("busy");
  });
});

describe("OpenRouterProvider", () => {
  it("refuses to be built with a model that is not free", () => {
    expect(() => new OpenRouterProvider({ apiKey: "k", models: ["anthropic/claude-opus-5.5"] })).toThrow("free");
  });

  it("streams the reply text", async () => {
    const provider = new OpenRouterProvider({
      apiKey: "k",
      fetch: async () => sse([": OPENROUTER PROCESSING", chunk("Aapka payment "), chunk("due hai."), "data: [DONE]"]),
    });
    expect(await collect(provider.reply(request))).toBe("Aapka payment due hai.");
  });

  it("sends the key, a free model and the system prompt", async () => {
    let seen: { url: string; init: RequestInit } | undefined;
    const provider = new OpenRouterProvider({
      apiKey: "secret-key",
      fetch: async (url, init) => {
        seen = { url, init };
        return sse([chunk("ok")]);
      },
    });
    await collect(provider.reply({ ...request, guidance: "Aim for 60 percent Hindi." }));

    const headers = seen?.init.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer secret-key");
    const body = JSON.parse(String(seen?.init.body));
    expect(isFreeModel(body.model)).toBe(true);
    expect(body.stream).toBe(true);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toContain("60 percent Hindi");
    expect(body.messages.at(-1)).toEqual({ role: "user", content: "kal meeting hai" });
  });

  it("tries the next free model when one is rate limited", async () => {
    const tried: string[] = [];
    const provider = new OpenRouterProvider({
      apiKey: "k",
      models: ["a/one:free", "b/two:free"],
      fetch: async (_url, init) => {
        const { model } = JSON.parse(String(init.body));
        tried.push(model);
        return model === "a/one:free" ? new Response("slow down", { status: 429 }) : sse([chunk("done")]);
      },
    });
    expect(await collect(provider.reply(request))).toBe("done");
    expect(tried).toEqual(["a/one:free", "b/two:free"]);
  });

  it("tries the next model when one answers with nothing", async () => {
    const provider = new OpenRouterProvider({
      apiKey: "k",
      models: ["a/one:free", "b/two:free"],
      fetch: async (_url, init) =>
        JSON.parse(String(init.body)).model === "a/one:free" ? sse(["data: [DONE]"]) : sse([chunk("hi")]),
    });
    expect(await collect(provider.reply(request))).toBe("hi");
  });

  it("does not retry a rejected key", async () => {
    let calls = 0;
    const provider = new OpenRouterProvider({
      apiKey: "bad",
      models: ["a/one:free", "b/two:free"],
      fetch: async () => {
        calls += 1;
        return new Response("no", { status: 401 });
      },
    });
    await expect(collect(provider.reply(request))).rejects.toBeInstanceOf(LlmUnavailableError);
    expect(calls).toBe(1);
  });

  it("fails clearly when every model is busy", async () => {
    const provider = new OpenRouterProvider({
      apiKey: "k",
      models: ["a/one:free", "b/two:free"],
      fetch: async () => new Response("busy", { status: 503 }),
    });
    await expect(collect(provider.reply(request))).rejects.toThrow("503");
  });

  it("does not switch models once text has been sent", async () => {
    let calls = 0;
    const provider = new OpenRouterProvider({
      apiKey: "k",
      models: ["a/one:free", "b/two:free"],
      fetch: async () => {
        calls += 1;
        return sse([chunk("Aapka "), `data: ${JSON.stringify({ error: { message: "cut off" } })}`]);
      },
    });
    await expect(collect(provider.reply(request))).rejects.toThrow("cut off");
    expect(calls).toBe(1);
  });

  it("rejects a history that does not end with the user", async () => {
    const provider = new OpenRouterProvider({ apiKey: "k", fetch: async () => sse([chunk("x")]) });
    await expect(collect(provider.reply({ history: [] }))).rejects.toThrow();
  });
});
