import { describe, expect, it } from "vitest";
import { LIMITS, parseReplyRequest } from "./reply-request";

const valid = { mode: "sangam", history: [{ role: "user", text: "kal meeting hai" }] };

describe("parseReplyRequest", () => {
  it("accepts a valid request and trims text", () => {
    const result = parseReplyRequest({ ...valid, history: [{ role: "user", text: "  kal meeting hai  " }] });
    expect(result).toEqual({
      ok: true,
      value: { mode: "sangam", history: [{ role: "user", text: "kal meeting hai" }] },
    });
  });

  it("keeps guidance and the target share", () => {
    const result = parseReplyRequest({ ...valid, guidance: "Reply in Hinglish.", targetHindiShare: 0.6 });
    expect(result).toMatchObject({ ok: true, value: { guidance: "Reply in Hinglish.", targetHindiShare: 0.6 } });
  });

  it("rejects anything that is not an object", () => {
    for (const body of [null, "text", 5, []]) {
      expect(parseReplyRequest(body)).toMatchObject({ ok: false });
    }
  });

  it("rejects an unknown mode", () => {
    expect(parseReplyRequest({ ...valid, mode: "other" })).toMatchObject({
      ok: false,
      error: expect.stringContaining("mode"),
    });
  });

  it("rejects an empty or missing history", () => {
    expect(parseReplyRequest({ ...valid, history: [] })).toMatchObject({ ok: false });
    expect(parseReplyRequest({ mode: "sangam" })).toMatchObject({ ok: false });
  });

  it("rejects a history that is too long", () => {
    const history = Array.from({ length: LIMITS.turns + 1 }, (_, i) => ({
      role: i % 2 ? "assistant" : "user",
      text: "x",
    }));
    expect(parseReplyRequest({ ...valid, history })).toMatchObject({
      ok: false,
      error: expect.stringContaining("at most"),
    });
  });

  it("rejects a bad role, blank text or text that is too long", () => {
    expect(parseReplyRequest({ ...valid, history: [{ role: "system", text: "x" }] })).toMatchObject({ ok: false });
    expect(parseReplyRequest({ ...valid, history: [{ role: "user", text: "   " }] })).toMatchObject({ ok: false });
    const long = "x".repeat(LIMITS.textChars + 1);
    expect(parseReplyRequest({ ...valid, history: [{ role: "user", text: long }] })).toMatchObject({ ok: false });
  });

  it("requires the last turn to be from the user", () => {
    const history = [
      { role: "user", text: "hello" },
      { role: "assistant", text: "hi" },
    ];
    expect(parseReplyRequest({ ...valid, history })).toMatchObject({
      ok: false,
      error: expect.stringContaining("last turn"),
    });
  });

  it("rejects bad guidance and an out-of-range target", () => {
    expect(parseReplyRequest({ ...valid, guidance: 5 })).toMatchObject({ ok: false });
    expect(parseReplyRequest({ ...valid, guidance: "x".repeat(LIMITS.guidanceChars + 1) })).toMatchObject({
      ok: false,
    });
    expect(parseReplyRequest({ ...valid, targetHindiShare: 1.5 })).toMatchObject({ ok: false });
    expect(parseReplyRequest({ ...valid, targetHindiShare: "0.5" })).toMatchObject({ ok: false });
    expect(parseReplyRequest({ ...valid, targetHindiShare: Number.NaN })).toMatchObject({ ok: false });
  });
});
