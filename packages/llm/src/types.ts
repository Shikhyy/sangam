/** One turn of the conversation so far. */
export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

export interface ReplyRequest {
  /** The conversation so far, oldest first. Must end with a user turn. */
  history: readonly ChatTurn[];
  /**
   * Instructions about how to answer, for example from `guide()` in @sangam/core.
   * Leave it out to get the model's own default style.
   */
  guidance?: string;
  /** Who the agent is and what it is for. Defaults to a payment-reminder assistant. */
  persona?: string;
  /** Used by the mock only: the Hindi share the reply should have. Real providers ignore it. */
  targetHindiShare?: number;
  signal?: AbortSignal;
}

export interface LlmProvider {
  readonly name: string;
  /** Stream the reply as text chunks. Throws LlmRefusalError if the model declines. */
  reply(request: ReplyRequest): AsyncIterable<string>;
}

/** The request was malformed (for example an empty history). Nothing was sent to a model. */
export class LlmRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmRequestError";
  }
}

/** The model declined to answer. Text streamed before the decline may already have been used. */
export class LlmRefusalError extends Error {
  readonly category: string | null;

  constructor(category: string | null) {
    super(category ? `The model declined to answer (category: ${category}).` : "The model declined to answer.");
    this.name = "LlmRefusalError";
    this.category = category;
  }
}

/** The provider could not be reached or turned the request down (bad key, rate limit, outage). */
export class LlmUnavailableError extends Error {
  /** The HTTP status when there was one. */
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "LlmUnavailableError";
    this.status = status;
  }
}
