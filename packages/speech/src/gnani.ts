export const GNANI_BASE = "https://api.vachana.ai";

/**
 * The models and settings Sangam uses, chosen from Gnani's own docs (checked 6 Nov 2026):
 *
 * - Prisma v3.0 for speech-to-text: it handles speech that mixes languages. `hi-IN,en-IN` tells it to
 *   listen for Hindi and English, and the `codemix` format keeps English words in Latin script while
 *   Hindi stays in Devanagari, which is the clearest signal for measuring a mix.
 * - Timbre v3.0 for text-to-speech: every voice speaks Hindi and English, so one voice can say a mixed
 *   reply. Shivani is described as warm, patient and empathy-first. `hi-en` is the Hinglish setting.
 */
export const GNANI_DEFAULTS = {
  sttModel: "prisma-v3.0",
  sttLanguages: "hi-IN,en-IN",
  sttFormat: "codemix",
  ttsModel: "timbre-v3.0",
  ttsVoice: "Shivani",
  ttsLanguage: "hi-en",
} as const;

/** Gnani documents audio up to 30 seconds for the REST speech-to-text endpoint. */
export const MAX_AUDIO_SECONDS = 30;

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export interface GnaniOptions {
  apiKey: string;
  sttModel?: string;
  sttLanguages?: string;
  sttFormat?: string;
  ttsModel?: string;
  ttsVoice?: string;
  ttsLanguage?: string;
  baseUrl?: string;
  /** For tests. */
  fetch?: FetchLike;
  /** Wait before the single retry after a 429, in milliseconds. Default 700. */
  retryDelayMs?: number;
  /** Give up on one request after this long, so a hung call cannot block the queue. Default 20,000. */
  timeoutMs?: number;
}

export interface Transcript {
  text: string;
  /** The language Gnani judged from the transcript, such as "hi-IN", when it says. */
  languageCode: string | null;
  /** True when the transcript was cut short and the audio should be shorter. */
  truncated: boolean;
}

export interface SpokenAudio {
  audio: ArrayBuffer;
  contentType: string;
}

/** Gnani could not do the job: a rejected key, no credit, a busy account, or bad input. */
export class SpeechError extends Error {
  readonly status: number | null;
  /** True when trying again later may work. */
  readonly retryable: boolean;

  constructor(message: string, status: number | null = null, retryable = false) {
    super(message);
    this.name = "SpeechError";
    this.status = status;
    this.retryable = retryable;
  }
}

/** A short, safe message for each status. The key and Gnani's raw body are never repeated. */
function messageFor(status: number, service: string): string {
  if (status === 401) return "Gnani did not accept the API key.";
  if (status === 402) return "The Gnani account is out of credit.";
  if (status === 403) return `The Gnani key is not allowed to use ${service}.`;
  if (status === 429) return "Gnani is busy with another request. Try again in a moment.";
  if (status === 400 || status === 422) {
    return `Gnani could not use that ${service === "speech-to-text" ? "audio" : "text"}.`;
  }
  return `Gnani ${service} failed (HTTP ${status}).`;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Gnani speech: transcribe a clip, or turn a reply into audio.
 *
 * Gnani can limit an account to one active request at a time and answers 429 otherwise, so every call
 * goes through a queue that runs one at a time, and a single 429 is retried once after a short wait.
 */
export class GnaniSpeech {
  readonly name = "gnani";
  private readonly apiKey: string;
  private readonly base: string;
  private readonly settings: Required<
    Pick<GnaniOptions, "sttModel" | "sttLanguages" | "sttFormat" | "ttsModel" | "ttsVoice" | "ttsLanguage">
  >;
  private readonly fetchImpl: FetchLike;
  private readonly retryDelayMs: number;
  private readonly timeoutMs: number;
  private tail: Promise<unknown> = Promise.resolve();

  constructor(options: GnaniOptions) {
    this.apiKey = options.apiKey;
    this.base = (options.baseUrl ?? GNANI_BASE).replace(/\/$/, "");
    this.settings = {
      sttModel: options.sttModel || GNANI_DEFAULTS.sttModel,
      sttLanguages: options.sttLanguages || GNANI_DEFAULTS.sttLanguages,
      sttFormat: options.sttFormat || GNANI_DEFAULTS.sttFormat,
      ttsModel: options.ttsModel || GNANI_DEFAULTS.ttsModel,
      ttsVoice: options.ttsVoice || GNANI_DEFAULTS.ttsVoice,
      ttsLanguage: options.ttsLanguage || GNANI_DEFAULTS.ttsLanguage,
    };
    this.fetchImpl = options.fetch ?? ((url, init) => fetch(url, init));
    this.retryDelayMs = options.retryDelayMs ?? 700;
    this.timeoutMs = options.timeoutMs ?? 20_000;
  }

  /** Run tasks one after another, whatever happens to the earlier ones. */
  private queued<T>(task: () => Promise<T>): Promise<T> {
    const result = this.tail.then(task, task);
    this.tail = result.catch(() => undefined);
    return result;
  }

  private async send(url: string, init: RequestInit, service: string): Promise<Response> {
    for (let attempt = 0; ; attempt += 1) {
      let response: Response;
      try {
        response = await this.fetchImpl(url, { ...init, signal: AbortSignal.timeout(this.timeoutMs) });
      } catch {
        throw new SpeechError(`Could not reach Gnani ${service}.`, null, true);
      }
      if (response.status === 429 && attempt === 0) {
        await wait(this.retryDelayMs);
        continue;
      }
      if (!response.ok) {
        throw new SpeechError(
          messageFor(response.status, service),
          response.status,
          response.status === 429 || response.status >= 500,
        );
      }
      return response;
    }
  }

  /** Turn a recorded clip (WAV, MP3, OGG, FLAC, AAC or M4A, up to 30 seconds) into text. */
  transcribe(audio: Blob, fileName = "speech.wav"): Promise<Transcript> {
    return this.queued(async () => {
      const form = new FormData();
      form.append("audio_file", audio, fileName);
      form.append("model", this.settings.sttModel);
      form.append("language_code", this.settings.sttLanguages);
      form.append("format", this.settings.sttFormat);

      const response = await this.send(
        `${this.base}/stt/v3`,
        { method: "POST", headers: { "X-API-Key-ID": this.apiKey }, body: form },
        "speech-to-text",
      );
      const data = (await response.json()) as {
        transcript?: unknown;
        detected_language_code?: unknown;
        truncated?: unknown;
      };
      return {
        text: typeof data.transcript === "string" ? data.transcript.trim() : "",
        languageCode: typeof data.detected_language_code === "string" ? data.detected_language_code : null,
        truncated: data.truncated === true,
      };
    });
  }

  /** Turn a reply into spoken audio, returned whole as WAV. */
  synthesize(text: string): Promise<SpokenAudio> {
    return this.queued(async () => {
      const response = await this.send(
        `${this.base}/api/v1/tts/inference`,
        {
          method: "POST",
          headers: { "X-API-Key-ID": this.apiKey, "content-type": "application/json" },
          body: JSON.stringify({
            text,
            model: this.settings.ttsModel,
            voice: this.settings.ttsVoice,
            language: this.settings.ttsLanguage,
            speed: 1.0,
            audio_config: {
              sample_rate: 24000,
              num_channels: 1,
              sample_width: 2,
              encoding: "linear_pcm",
              container: "wav",
            },
          }),
        },
        "text-to-speech",
      );
      return { audio: await response.arrayBuffer(), contentType: response.headers.get("content-type") ?? "audio/wav" };
    });
  }
}

/** Build the Gnani client from environment settings, or null when no key is set. */
export function createSpeech(env: Readonly<Record<string, string | undefined>>): GnaniSpeech | null {
  const apiKey = env.GNANI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GnaniSpeech({
    apiKey,
    sttModel: env.GNANI_STT_MODEL?.trim(),
    sttLanguages: env.GNANI_STT_LANGUAGES?.trim(),
    sttFormat: env.GNANI_STT_FORMAT?.trim(),
    ttsModel: env.GNANI_TTS_MODEL?.trim(),
    ttsVoice: env.GNANI_TTS_VOICE?.trim(),
    ttsLanguage: env.GNANI_TTS_LANGUAGE?.trim(),
  });
}
