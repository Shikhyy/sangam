import { AnthropicProvider, type Effort } from "./anthropic";
import { MockProvider } from "./mock";
import type { LlmProvider } from "./types";

const EFFORTS: readonly string[] = ["low", "medium", "high", "xhigh", "max"];

/**
 * Pick a provider from environment settings (pass `process.env`):
 *
 * - `SANGAM_MODE` is "mock" (the default) or "live".
 * - Live needs `ANTHROPIC_API_KEY`. `SANGAM_LLM_MODEL` and `SANGAM_LLM_EFFORT` are optional.
 *
 * Anything other than "live" gets the mock, so a missing setting never reaches the network.
 */
export function createProvider(env: Readonly<Record<string, string | undefined>>): LlmProvider {
  if (env.SANGAM_MODE !== "live") return new MockProvider();

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("SANGAM_MODE=live needs ANTHROPIC_API_KEY to be set");

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
