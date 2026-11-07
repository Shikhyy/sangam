import { AnthropicProvider, type Effort } from "./anthropic";
import { MockProvider } from "./mock";
import { FREE_MODELS, OpenRouterProvider } from "./openrouter";
import type { LlmProvider } from "./types";

const EFFORTS: readonly string[] = ["low", "medium", "high", "xhigh", "max"];

/**
 * Pick a provider from environment settings (pass `process.env`):
 *
 * - `SANGAM_MODE` is "mock" (the default) or "live".
 * - Live uses OpenRouter, free models only, when `OPENROUTER_API_KEY` is set. `OPENROUTER_MODEL` may list
 *   one or more free model ids, separated by commas, to try in order.
 * - Otherwise live uses Claude when `ANTHROPIC_API_KEY` is set; `SANGAM_LLM_MODEL` and
 *   `SANGAM_LLM_EFFORT` are optional.
 *
 * Anything other than "live" gets the mock, so a missing setting never reaches the network.
 */
export function createProvider(env: Readonly<Record<string, string | undefined>>): LlmProvider {
  if (env.SANGAM_MODE !== "live") return new MockProvider();

  const openRouterKey = env.OPENROUTER_API_KEY?.trim();
  if (openRouterKey) {
    const listed = (env.OPENROUTER_MODEL ?? "")
      .split(",")
      .map((model) => model.trim())
      .filter(Boolean);
    return new OpenRouterProvider({ apiKey: openRouterKey, models: listed.length > 0 ? listed : FREE_MODELS });
  }

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("SANGAM_MODE=live needs OPENROUTER_API_KEY or ANTHROPIC_API_KEY to be set");

  const effort = env.SANGAM_LLM_EFFORT;
  if (effort && !EFFORTS.includes(effort)) {
    throw new Error(`SANGAM_LLM_EFFORT must be one of ${EFFORTS.join(", ")}, got "${effort}"`);
  }

  return new AnthropicProvider({
    apiKey,
    model: env.SANGAM_LLM_MODEL || undefined,
    effort: effort ? (effort as Effort) : undefined,
  });
}
