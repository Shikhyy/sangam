import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, validateHistory } from "./prompt";
import { type LlmProvider, LlmRefusalError, type ReplyRequest } from "./types";

/** The model used unless one is configured. */
export const DEFAULT_MODEL = "claude-opus-5-5";

/** Beta that lets the API retry a refused request on a fallback model itself. */
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/** The slice of the SDK this provider uses, so tests can pass a fake. */
interface StreamLike extends AsyncIterable<unknown> {
  finalMessage(): Promise<{ stop_reason: string | null; stop_details?: { category?: string | null } | null }>;
}

export interface ClientLike {
  beta: {
    messages: {
      stream(params: unknown, options?: { signal?: AbortSignal }): StreamLike;
    };
  };
}

export interface AnthropicProviderOptions {
  /** Defaults to the ANTHROPIC_API_KEY environment variable (the SDK reads it). */
  apiKey?: string;
  model?: string;
  /** Replies are short and spoken, so the default is "low" to keep the pause before speech small. */
  effort?: Effort;
  /** Includes thinking and text, so leave room above the length of the spoken reply. Default 4096. */
  maxTokens?: number;
  /** Let the API retry a refused request on a fallback model. Default true. */
  refusalFallback?: boolean;
  /** For tests. */
  client?: ClientLike;
}

/** Pull the text out of a streaming event, or null for any other event. */
export function textDeltaOf(event: unknown): string | null {
  if (typeof event !== "object" || event === null) return null;
  const e = event as { type?: unknown; delta?: { type?: unknown; text?: unknown } };
  if (e.type === "content_block_delta" && e.delta?.type === "text_delta" && typeof e.delta.text === "string") {
    return e.delta.text;
  }
  return null;
}

/**
 * Reply generation with Claude, streamed.
 *
 * Notes for the model in use (claude-opus-5-5): thinking is always on and cannot be
 * disabled, so effort is the only latency control; `temperature`, `top_p` and `top_k`
 * are rejected, so none is sent; forced tool use is not used.
 */
export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";
  private readonly client: ClientLike;
  private readonly model: string;
  private readonly effort: Effort;
  private readonly maxTokens: number;
  private readonly refusalFallback: boolean;

  constructor(options: AnthropicProviderOptions = {}) {
    this.client = options.client ?? new Anthropic(options.apiKey ? { apiKey: options.apiKey } : {});
    this.model = options.model ?? DEFAULT_MODEL;
    this.effort = options.effort ?? "low";
    this.maxTokens = options.maxTokens ?? 4096;
    this.refusalFallback = options.refusalFallback ?? true;
  }

  async *reply(request: ReplyRequest): AsyncIterable<string> {
    const messages = validateHistory(request.history);

    const params: Record<string, unknown> = {
      model: this.model,
      max_tokens: this.maxTokens,
      system: buildSystemPrompt({ persona: request.persona, guidance: request.guidance }),
      messages,
      output_config: { effort: this.effort },
    };
    if (this.refusalFallback) {
      params.betas = [FALLBACK_BETA];
      params.fallbacks = "default";
    }

    const stream = this.client.beta.messages.stream(params, request.signal ? { signal: request.signal } : undefined);

    for await (const event of stream) {
      const text = textDeltaOf(event);
      if (text) yield text;
    }

    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") {
      throw new LlmRefusalError(final.stop_details?.category ?? null);
    }
  }
}
