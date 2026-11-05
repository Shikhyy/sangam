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
    expect(() => createProvider({ SANGAM_MODE: "live" })).toThrow("ANTHROPIC_API_KEY");
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
});
