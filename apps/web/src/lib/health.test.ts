import { describe, expect, it } from "vitest";
import { healthOf } from "./health";

describe("healthOf", () => {
  it("reports a keyless setup as mock, open and without speech", () => {
    expect(healthOf({})).toEqual({ ok: true, mode: "mock", reply: "mock", speech: false, api: "open" });
  });

  it("reports live mode with OpenRouter and Gnani", () => {
    const health = healthOf({ SANGAM_MODE: "live", OPENROUTER_API_KEY: "sk-or-x", GNANI_API_KEY: "g" });
    expect(health).toMatchObject({ mode: "live", reply: "openrouter", speech: true });
  });

  it("says misconfigured when live mode has no key, so a bad deploy is obvious", () => {
    expect(healthOf({ SANGAM_MODE: "live" }).reply).toBe("misconfigured");
  });

  it("does not count blank settings", () => {
    expect(healthOf({ GNANI_API_KEY: "  ", SANGAM_API_KEYS: " " })).toMatchObject({ speech: false, api: "open" });
  });

  it("reports when the API needs a key", () => {
    expect(healthOf({ SANGAM_API_KEYS: "a, b" }).api).toBe("keys");
  });

  it("never includes a key's value", () => {
    const text = JSON.stringify(
      healthOf({
        SANGAM_MODE: "live",
        OPENROUTER_API_KEY: "sk-or-secret",
        GNANI_API_KEY: "gnani-secret",
        SANGAM_API_KEYS: "api-secret",
      }),
    );
    expect(text).not.toMatch(/secret/);
  });
});
