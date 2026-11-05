import type { LlmProvider, ReplyRequest } from "./types";

/** A canned reply, used for targets up to `maxHindiShare`. */
export interface MockScript {
  maxHindiShare: number;
  text: string;
}

/**
 * Ordered from most English to most Hindi. The first script whose `maxHindiShare`
 * is at least the target wins. Roughly 9%, 63% and 75% Hindi by the core tagger
 * (checked by a test, so edits here cannot drift out of range unnoticed).
 */
export const DEFAULT_MOCK_SCRIPTS: readonly MockScript[] = [
  { maxHindiShare: 0.3, text: "Your payment is due tomorrow, please pay it today ji." },
  { maxHindiShare: 0.7, text: "Aapka payment due hai, please aaj hi kar dijiye." },
  { maxHindiShare: 1, text: "Aapka payment kal due hai. Aaj hi kar dijiye." },
];

export interface MockProviderOptions {
  scripts?: readonly MockScript[];
  /** Pause between chunks, to imitate streaming. Default 0. */
  delayMs?: number;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** A provider that needs no key and no network. For development, tests and offline demos. */
export class MockProvider implements LlmProvider {
  readonly name = "mock";
  private readonly scripts: readonly MockScript[];
  private readonly delayMs: number;

  constructor(options: MockProviderOptions = {}) {
    this.scripts = options.scripts ?? DEFAULT_MOCK_SCRIPTS;
    this.delayMs = options.delayMs ?? 0;
  }

  async *reply(request: ReplyRequest): AsyncIterable<string> {
    const target = request.targetHindiShare ?? 0.5;
    const script = this.scripts.find((s) => target <= s.maxHindiShare) ?? this.scripts[this.scripts.length - 1];
    if (!script) return;

    const words = script.text.split(" ");
    for (const [index, word] of words.entries()) {
      if (request.signal?.aborted) return;
      if (this.delayMs > 0) await sleep(this.delayMs);
      yield index < words.length - 1 ? `${word} ` : word;
    }
  }
}
