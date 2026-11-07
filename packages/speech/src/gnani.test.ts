import { describe, expect, it } from "vitest";
import { createSpeech, GNANI_DEFAULTS, GnaniSpeech, SpeechError } from "./gnani";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const clip = new Blob([new Uint8Array([1, 2, 3])], { type: "audio/wav" });

describe("GnaniSpeech.transcribe", () => {
  it("sends the clip with Prisma v3.0, Hindi and English, and the codemix format", async () => {
    let seen: { url: string; init: RequestInit } | undefined;
    const speech = new GnaniSpeech({
      apiKey: "secret-key",
      fetch: async (url, init) => {
        seen = { url, init };
        return json({ success: true, transcript: " मेरा payment due है ", detected_language_code: "hi-IN" });
      },
    });

    const result = await speech.transcribe(clip);

    expect(seen?.url).toBe("https://api.vachana.ai/stt/v3");
    const headers = seen?.init.headers as Record<string, string> | undefined;
    expect(headers?.["X-API-Key-ID"]).toBe("secret-key");
    const form = seen?.init.body as FormData;
    expect(form.get("model")).toBe(GNANI_DEFAULTS.sttModel);
    expect(form.get("language_code")).toBe("hi-IN,en-IN");
    expect(form.get("format")).toBe("codemix");
    expect(form.get("audio_file")).toBeInstanceOf(Blob);
    expect(result).toEqual({ text: "मेरा payment due है", languageCode: "hi-IN", truncated: false });
  });

  it("treats silence as an empty transcript, not an error", async () => {
    const speech = new GnaniSpeech({ apiKey: "k", fetch: async () => json({ success: true, transcript: "" }) });
    expect((await speech.transcribe(clip)).text).toBe("");
  });

  it("reports a truncated transcript", async () => {
    const speech = new GnaniSpeech({
      apiKey: "k",
      fetch: async () => json({ success: true, transcript: "kal", truncated: true }),
    });
    expect((await speech.transcribe(clip)).truncated).toBe(true);
  });
});

describe("GnaniSpeech.synthesize", () => {
  it("asks Timbre v3.0 for a Hinglish WAV and returns the audio", async () => {
    let body: Record<string, unknown> = {};
    const speech = new GnaniSpeech({
      apiKey: "k",
      fetch: async (url, init) => {
        expect(url).toBe("https://api.vachana.ai/api/v1/tts/inference");
        body = JSON.parse(String(init.body));
        return new Response(new Uint8Array([9, 8, 7]), { status: 200, headers: { "content-type": "audio/wav" } });
      },
    });

    const result = await speech.synthesize("Aapka payment due hai.");

    expect(body.text).toBe("Aapka payment due hai.");
    expect(body.model).toBe("timbre-v3.0");
    expect(body.voice).toBe("Shivani");
    expect(body.language).toBe("hi-en");
    expect((body.audio_config as Record<string, unknown>).container).toBe("wav");
    expect(new Uint8Array(result.audio)).toEqual(new Uint8Array([9, 8, 7]));
    expect(result.contentType).toBe("audio/wav");
  });

  it("uses a voice from the environment", async () => {
    let voice = "";
    const speech = new GnaniSpeech({
      apiKey: "k",
      ttsVoice: "Avinash",
      fetch: async (_url, init) => {
        voice = JSON.parse(String(init.body)).voice;
        return new Response(new Uint8Array([1]), { status: 200 });
      },
    });
    await speech.synthesize("hi");
    expect(voice).toBe("Avinash");
  });
});

describe("errors", () => {
  it("maps statuses to short messages that never repeat the key", async () => {
    for (const [status, text] of [
      [401, "did not accept"],
      [402, "out of credit"],
      [403, "not allowed"],
    ] as const) {
      const speech = new GnaniSpeech({
        apiKey: "secret-key",
        fetch: async () => json({ detail: { message: "secret-key leaked" } }, status),
      });
      const error = await speech.transcribe(clip).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(SpeechError);
      expect((error as SpeechError).message).toContain(text);
      expect((error as SpeechError).message).not.toContain("secret-key");
      expect((error as SpeechError).status).toBe(status);
    }
  });

  it("retries a 429 once, then gives up", async () => {
    let calls = 0;
    const speech = new GnaniSpeech({
      apiKey: "k",
      retryDelayMs: 1,
      fetch: async () => {
        calls += 1;
        return json({ detail: { error_code: "RATE_LIMITED" } }, 429);
      },
    });
    const error = (await speech.transcribe(clip).catch((e: unknown) => e)) as SpeechError;
    expect(calls).toBe(2);
    expect(error.retryable).toBe(true);
  });

  it("succeeds when the retry after a 429 works", async () => {
    let calls = 0;
    const speech = new GnaniSpeech({
      apiKey: "k",
      retryDelayMs: 1,
      fetch: async () => {
        calls += 1;
        return calls === 1 ? json({}, 429) : json({ success: true, transcript: "ok" });
      },
    });
    expect((await speech.transcribe(clip)).text).toBe("ok");
  });

  it("reports a network failure as retryable", async () => {
    const speech = new GnaniSpeech({
      apiKey: "k",
      fetch: async () => {
        throw new Error("offline");
      },
    });
    const error = (await speech.synthesize("hi").catch((e: unknown) => e)) as SpeechError;
    expect(error.retryable).toBe(true);
  });
});

describe("one request at a time", () => {
  it("never has two requests in flight", async () => {
    let active = 0;
    let peak = 0;
    const speech = new GnaniSpeech({
      apiKey: "k",
      fetch: async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        return json({ success: true, transcript: "x" });
      },
    });
    await Promise.all([speech.transcribe(clip), speech.transcribe(clip), speech.transcribe(clip)]);
    expect(peak).toBe(1);
  });

  it("keeps going after a failed request", async () => {
    let calls = 0;
    const speech = new GnaniSpeech({
      apiKey: "k",
      fetch: async () => {
        calls += 1;
        return calls === 1 ? json({}, 401) : json({ success: true, transcript: "fine" });
      },
    });
    const first = speech.transcribe(clip).catch(() => null);
    const second = speech.transcribe(clip);
    await first;
    expect((await second).text).toBe("fine");
  });
});

describe("createSpeech", () => {
  it("returns null without a key, so nothing reaches the network", () => {
    expect(createSpeech({})).toBeNull();
    expect(createSpeech({ GNANI_API_KEY: "   " })).toBeNull();
  });

  it("builds a client when a key is set", () => {
    expect(createSpeech({ GNANI_API_KEY: "k" })?.name).toBe("gnani");
  });
});
