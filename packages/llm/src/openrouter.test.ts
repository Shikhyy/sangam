import { describe, expect, it } from "vitest";
import { FREE_MODELS, isFreeModel, isLeakedReasoning, OpenRouterProvider, textOfLine } from "./openrouter";
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
    // Long enough to pass the opening check, so the person has already seen it.
    const opening =
      "Aapka payment kal due hai, please aaj hi kar dijiye, aur agar koi sawaal ho to mujhe zaroor bataiye. ";
    let calls = 0;
    const provider = new OpenRouterProvider({
      apiKey: "k",
      models: ["a/one:free", "b/two:free"],
      fetch: async () => {
        calls += 1;
        return sse([chunk(opening), `data: ${JSON.stringify({ error: { message: "cut off" } })}`]);
      },
    });
    await expect(collect(provider.reply(request))).rejects.toThrow("cut off");
    expect(calls).toBe(1);
  });

  it("tries the next model when one fails before any text reaches the person", async () => {
    let calls = 0;
    const provider = new OpenRouterProvider({
      apiKey: "k",
      models: ["a/one:free", "b/two:free"],
      fetch: async () => {
        calls += 1;
        return calls === 1
          ? sse([chunk("Aapka "), `data: ${JSON.stringify({ error: { message: "cut off" } })}`])
          : sse([chunk("Aapka payment kal due hai."), "data: [DONE]"]);
      },
    });
    expect(await collect(provider.reply(request))).toBe("Aapka payment kal due hai.");
    expect(calls).toBe(2);
  });

  it("reports a network failure as the service being unavailable", async () => {
    const provider = new OpenRouterProvider({
      apiKey: "k",
      models: ["a/one:free"],
      fetch: async () => {
        throw new TypeError("fetch failed");
      },
    });
    await expect(collect(provider.reply(request))).rejects.toBeInstanceOf(LlmUnavailableError);
  });

  it("rejects a history that does not end with the user", async () => {
    const provider = new OpenRouterProvider({ apiKey: "k", fetch: async () => sse([chunk("x")]) });
    await expect(collect(provider.reply({ history: [] }))).rejects.toThrow();
  });

  it("moves on to the next model when one hangs", async () => {
    const provider = new OpenRouterProvider({
      apiKey: "k",
      models: ["a/one:free", "b/two:free"],
      timeoutMs: 30,
      fetch: (_url, init) => {
        const { model } = JSON.parse(String(init.body));
        if (model === "a/one:free") {
          return new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => reject(new Error("timed out")));
          });
        }
        return Promise.resolve(sse([chunk("made it")]));
      },
    });
    expect(await collect(provider.reply(request))).toBe("made it");
  });

  it("moves on to the next model when one writes its reasoning instead of a reply", async () => {
    const leaked =
      "1. **Analyze the Request:** * **Role:** Polite payment-reminder assistant. * **Format:** Plain spoken";
    const calls: string[] = [];
    const provider = new OpenRouterProvider({
      apiKey: "k",
      models: ["a:free", "b:free"],
      fetch: async (_url, init) => {
        const model = JSON.parse(String(init.body)).model as string;
        calls.push(model);
        return model === "a:free"
          ? sse([chunk(leaked.slice(0, 40)), chunk(leaked.slice(40)), "data: [DONE]"])
          : sse([chunk("Aapka payment kal due hai, "), chunk("please aaj hi kar dijiye."), "data: [DONE]"]);
      },
    });

    expect(await collect(provider.reply(request))).toBe("Aapka payment kal due hai, please aaj hi kar dijiye.");
    expect(calls).toEqual(["a:free", "b:free"]);
  });

  it("fails clearly when every model leaks its reasoning", async () => {
    const provider = new OpenRouterProvider({
      apiKey: "k",
      models: ["a:free"],
      fetch: async () =>
        sse([chunk("1. **Analyze the Request:** the user wants to know when the payment is due and"), "data: [DONE]"]),
    });
    await expect(collect(provider.reply(request))).rejects.toThrow("reasoning");
  });

  it("passes a short real reply that ends before the check length", async () => {
    const provider = new OpenRouterProvider({
      apiKey: "k",
      models: ["a:free"],
      fetch: async () => sse([chunk("Theek hai, "), chunk("kal milte hain."), "data: [DONE]"]),
    });
    expect(await collect(provider.reply(request))).toBe("Theek hai, kal milte hain.");
  });
});

describe("isLeakedReasoning", () => {
  it("flags reasoning, markdown and list starts", () => {
    expect(isLeakedReasoning("1. **Analyze the Request:** * **Role:** assistant")).toBe(true);
    expect(isLeakedReasoning("Thinking Process: first I should look at the user")).toBe(true);
    expect(isLeakedReasoning("* Aapka payment due hai")).toBe(true);
    expect(isLeakedReasoning("Aapka **payment** kal due hai")).toBe(true);
  });

  it("lets plain Hinglish and English through", () => {
    expect(isLeakedReasoning("Aapka payment kal due hai, please aaj hi kar dijiye.")).toBe(false);
    expect(isLeakedReasoning("Sure, your payment is due on Friday. I can help you pay it now.")).toBe(false);
    expect(isLeakedReasoning("आपका payment कल due है।")).toBe(false);
  });
});
