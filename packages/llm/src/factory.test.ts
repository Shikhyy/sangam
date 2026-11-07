import { describe, expect, it } from "vitest";
import { createProvider } from "./factory";

describe("createProvider", () => {
  it("returns the mock when nothing is configured", () => {
    expect(createProvider({}).name).toBe("mock");
  });

  it("returns the mock for mock mode and for unknown modes", () => {
    expect(createProvider({ SANGAM_MODE: "mock" }).name).toBe("mock");
    expect(createProvider({ SANGAM_MODE: "production" }).name).toBe("mock");
  });

  it("does not use a key unless live mode is asked for", () => {
    expect(createProvider({ ANTHROPIC_API_KEY: "sk-test" }).name).toBe("mock");
  });

  it("requires a key in live mode", () => {
    expect(() => createProvider({ SANGAM_MODE: "live" })).toThrow("OPENROUTER_API_KEY");
  });

  it("builds the Claude provider in live mode", () => {
    // Constructing the client does not touch the network.
    expect(createProvider({ SANGAM_MODE: "live", ANTHROPIC_API_KEY: "sk-test" }).name).toBe("anthropic");
  });

  it("accepts a valid effort and rejects an invalid one", () => {
    const live = { SANGAM_MODE: "live", ANTHROPIC_API_KEY: "sk-test" };
    expect(createProvider({ ...live, SANGAM_LLM_EFFORT: "high" }).name).toBe("anthropic");
    expect(() => createProvider({ ...live, SANGAM_LLM_EFFORT: "turbo" })).toThrow("SANGAM_LLM_EFFORT");
  });

  it("prefers OpenRouter in live mode when its key is set", () => {
    expect(createProvider({ SANGAM_MODE: "live", OPENROUTER_API_KEY: "sk-or-test" }).name).toBe("openrouter");
    expect(
      createProvider({ SANGAM_MODE: "live", OPENROUTER_API_KEY: "sk-or-test", ANTHROPIC_API_KEY: "sk-test" }).name,
    ).toBe("openrouter");
  });

  it("accepts a list of free OpenRouter models", () => {
    const env = { SANGAM_MODE: "live", OPENROUTER_API_KEY: "sk-or-test" };
    expect(createProvider({ ...env, OPENROUTER_MODEL: "google/gemma-4-31b-it:free, openrouter/free" }).name).toBe(
      "openrouter",
    );
  });

  it("refuses a model that is not free", () => {
    const env = { SANGAM_MODE: "live", OPENROUTER_API_KEY: "sk-or-test" };
    expect(() => createProvider({ ...env, OPENROUTER_MODEL: "anthropic/claude-opus-5.5" })).toThrow("free");
  });
});
