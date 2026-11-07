import { createProvider } from "@sangam/llm";
import { createSpeech } from "@sangam/speech";

export interface Health {
  ok: true;
  /** "mock" runs with scripted replies; "live" uses the real providers. */
  mode: "mock" | "live";
  /** Which service writes replies. "misconfigured" means live mode is on but no usable key is set. */
  reply: "mock" | "openrouter" | "anthropic" | "misconfigured";
  /** Whether Gnani speech is set up. */
  speech: boolean;
  /** Whether the public API asks for a key. */
  api: "open" | "keys";
}

/** A summary of how the server is set up, for checking a deploy. Says which things are set, never their values. */
export function healthOf(env: Readonly<Record<string, string | undefined>>): Health {
  let reply: Health["reply"];
  try {
    reply = createProvider(env).name as Health["reply"];
  } catch {
    reply = "misconfigured";
  }
  return {
    ok: true,
    mode: env.SANGAM_MODE === "live" ? "live" : "mock",
    reply,
    speech: createSpeech(env) !== null,
    api: (env.SANGAM_API_KEYS ?? "").trim() ? "keys" : "open",
  };
}
