import { describe, expect, it } from "vitest";
import { callerOf, createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit, then refuses", () => {
    const allow = createRateLimiter(3, 1000);
    expect([allow("a", 0), allow("a", 1), allow("a", 2), allow("a", 3)]).toEqual([true, true, true, false]);
  });

  it("lets a caller back in once the window has passed", () => {
    const allow = createRateLimiter(1, 1000);
    expect(allow("a", 0)).toBe(true);
    expect(allow("a", 500)).toBe(false);
    expect(allow("a", 1001)).toBe(true);
  });

  it("counts each caller separately", () => {
    const allow = createRateLimiter(1, 1000);
    expect(allow("a", 0)).toBe(true);
    expect(allow("b", 0)).toBe(true);
    expect(allow("a", 1)).toBe(false);
  });
});

describe("callerOf", () => {
  it("uses the first forwarded address", () => {
    const request = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(callerOf(request)).toBe("1.2.3.4");
  });

  it("falls back to one shared bucket", () => {
    expect(callerOf(new Request("http://x"))).toBe("local");
  });
});
