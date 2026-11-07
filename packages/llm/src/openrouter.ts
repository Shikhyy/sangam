import { buildSystemPrompt, validateHistory } from "./prompt";
import { type LlmProvider, LlmUnavailableError, type ReplyRequest } from "./types";

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Free models, in the order they are tried. Gemma is strong in Hindi and English, so it goes first;
 * the large Nemotron is a capable second choice; the free router picks whatever free model is up.
 * Every id here is free, so a request through this provider never costs money.
 */
export const FREE_MODELS: readonly string[] = [
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "openrouter/free",
];

/** Free models on OpenRouter end in ":free"; the router that only picks free models is the one exception. */
export function isFreeModel(id: string): boolean {
  return id.endsWith(":free") || id === "openrouter/free";
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export interface OpenRouterProviderOptions {
  apiKey: string;
  /** Models to try in order. Every one must be free. Defaults to FREE_MODELS. */
  models?: readonly string[];
  /** Replies are short and spoken. Default 300. */
  maxTokens?: number;
  /** For tests. */
  fetch?: FetchLike;
}

/** Pull the text out of one server-sent-event line, or null for anything else. */
export function textOfLine(line: string): string | null {
  if (!line.startsWith("data:")) return null;
  const data = line.slice(5).trim();
  if (!data || data === "[DONE]") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return null;
  }
  const event = parsed as { error?: { message?: unknown }; choices?: { delta?: { content?: unknown } }[] };
  if (event.error) {
    const message = typeof event.error.message === "string" ? event.error.message : "the model stopped early";
    throw new LlmUnavailableError(message);
  }
  const content = event.choices?.[0]?.delta?.content;
  return typeof content === "string" && content.length > 0 ? content : null;
}

/** Statuses that mean "this model is busy or broken, try the next one". */
const RETRYABLE = new Set([404, 408, 429, 500, 502, 503, 504]);

/**
 * Reply generation through OpenRouter, free models only, streamed.
 *
 * If a model is rate-limited or down before it has said anything, the next free model is tried. A
 * rejected key (401, 402, 403) is not retried, because every model would fail the same way.
 */
export class OpenRouterProvider implements LlmProvider {
  readonly name = "openrouter";
  private readonly apiKey: string;
  private readonly models: readonly string[];
  private readonly maxTokens: number;
  private readonly fetchImpl: FetchLike;

  constructor(options: OpenRouterProviderOptions) {
    const models = options.models ?? FREE_MODELS;
    if (models.length === 0) throw new Error("OpenRouterProvider needs at least one model");
    const paid = models.filter((model) => !isFreeModel(model));
    if (paid.length > 0) {
      throw new Error(`Only free OpenRouter models are allowed (ids ending in ":free"). Not free: ${paid.join(", ")}`);
    }
    this.apiKey = options.apiKey;
    this.models = models;
    this.maxTokens = options.maxTokens ?? 300;
    this.fetchImpl = options.fetch ?? ((url, init) => fetch(url, init));
  }

  async *reply(request: ReplyRequest): AsyncIterable<string> {
    const history = validateHistory(request.history);
    const messages = [
      { role: "system", content: buildSystemPrompt({ persona: request.persona, guidance: request.guidance }) },
      ...history,
    ];

    let lastError: Error = new LlmUnavailableError("No free model answered");
    for (const model of this.models) {
      let spoke = false;
      try {
        const response = await this.fetchImpl(OPENROUTER_URL, {
          method: "POST",
          headers: {
            authorization: `Bearer ${this.apiKey}`,
            "content-type": "application/json",
            "x-title": "Sangam",
          },
          body: JSON.stringify({ model, messages, stream: true, max_tokens: this.maxTokens }),
          signal: request.signal,
        });

        if (!response.ok) {
          const error = new LlmUnavailableError(`OpenRouter returned ${response.status} for ${model}`, response.status);
          if (RETRYABLE.has(response.status)) {
            lastError = error;
            continue;
          }
          throw error;
        }
        if (!response.body) throw new LlmUnavailableError(`OpenRouter sent no body for ${model}`, response.status);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
          buffer += decoder.decode(chunk.value, { stream: true });
          let newline = buffer.indexOf("\n");
          while (newline !== -1) {
            const text = textOfLine(buffer.slice(0, newline).trim());
            buffer = buffer.slice(newline + 1);
            if (text) {
              spoke = true;
              yield text;
            }
            newline = buffer.indexOf("\n");
          }
        }
        const rest = textOfLine(buffer.trim());
        if (rest) {
          spoke = true;
          yield rest;
        }
        if (spoke) return;
        lastError = new LlmUnavailableError(`${model} returned an empty reply`);
      } catch (error) {
        if (request.signal?.aborted) throw error;
        if (spoke) throw error;
        if (error instanceof LlmUnavailableError && error.status !== null && !RETRYABLE.has(error.status)) throw error;
        lastError = error instanceof Error ? error : new LlmUnavailableError(String(error));
      }
    }
    throw lastError;
  }
}
