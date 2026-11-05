import { matrixFromShare } from "./metrics";
import { tag } from "./tagger";
import type { MatrixLanguage, Profile } from "./types";

export type Register = "formal" | "neutral" | "casual";
export type OutputScript = "roman" | "devanagari";

/** The mix an agent reply should aim for. */
export interface Target {
  hindiShare: number;
  switchRate: number;
  matrixLanguage: MatrixLanguage;
}

export interface GuideInput {
  profile: Profile;
  /** How formal the agent should sound. Default "neutral". */
  register?: Register;
  /** Script for Hindi words in the reply. Default "roman". */
  outputScript?: OutputScript;
  /** Words from the user's latest turns, to reuse in the reply. */
  recentUserWords?: readonly string[];
  /** Maximum sentences per reply (replies are spoken aloud). Default 2. */
  maxSentences?: number;
}

export interface Guidance {
  target: Target;
  /** Plain-language instructions to put in the LLM prompt. */
  promptFragment: string;
  /** Up to 8 words from the user's own speech the reply may reuse. */
  borrowedWords: string[];
  /** Things the reply should not do. */
  avoid: string[];
  /** True when the profile had too little data and a balanced mix was used. */
  usedPrior: boolean;
}

/** The most the agent will switch mid-sentence, by register. */
export const REGISTER_LIMITS: Record<Register, { maxSwitchRate: number }> = {
  formal: { maxSwitchRate: 0.2 },
  neutral: { maxSwitchRate: 0.4 },
  casual: { maxSwitchRate: 0.6 },
};

/** The agent never goes fully one-language, however one-sided the user is. */
export const SHARE_CLAMP = { min: 0.1, max: 0.9 } as const;

/** Used when there is not enough data about the user yet. */
export const PRIOR_TARGET: Target = { hindiShare: 0.5, switchRate: 0.2, matrixLanguage: "balanced" };

const MAX_BORROWED = 8;
const SLANG = new Set(["yaar", "yaaar", "bhai", "bro", "dude", "arre", "arey", "abe", "oye"]);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function collectWords(
  profile: Profile,
  recent: readonly string[],
  register: Register,
): { english: string[]; hindi: string[] } {
  const seen = new Set<string>();
  const english: string[] = [];
  const hindi: string[] = [];

  for (const raw of [...profile.signatureWords, ...recent]) {
    if (english.length + hindi.length >= MAX_BORROWED) break;
    const word = raw.trim().toLowerCase();
    if (!word || seen.has(word)) continue;
    seen.add(word);
    if (register !== "casual" && SLANG.has(word)) continue;

    const tokens = tag(word);
    const [token] = tokens;
    if (tokens.length !== 1 || !token || token.lang === "X") continue;
    (token.lang === "EN" ? english : hindi).push(word);
  }
  return { english, hindi };
}

function switchingLine(switchRate: number): string {
  if (switchRate < 0.1) {
    return "Keep each sentence mostly in one language; switch between sentences rather than inside them.";
  }
  if (switchRate < 0.25) return "Switch language inside a sentence only occasionally, mainly for nouns.";
  return "Switch language inside sentences freely, the way the user does.";
}

const TONE: Record<Register, string> = {
  formal: "Use polite, formal wording (aap, never tu or tum).",
  neutral: "Use a polite, friendly tone.",
  casual: "A casual, friendly tone is fine.",
};

/**
 * Turn a speaker profile into guidance for the agent's next reply.
 * With low confidence it falls back to a balanced mix and says so.
 */
export function guide(input: GuideInput): Guidance {
  const { profile, register = "neutral", outputScript = "roman", recentUserWords = [], maxSentences = 2 } = input;

  const usedPrior = profile.confidence === "low";
  const cap = REGISTER_LIMITS[register].maxSwitchRate;

  const target: Target = usedPrior
    ? { ...PRIOR_TARGET, switchRate: Math.min(PRIOR_TARGET.switchRate, cap) }
    : (() => {
        const hindiShare = clamp(profile.hindiShare, SHARE_CLAMP.min, SHARE_CLAMP.max);
        return {
          hindiShare,
          switchRate: Math.min(profile.switchRate, cap),
          matrixLanguage: matrixFromShare(hindiShare, profile.tokenCount),
        };
      })();

  const { english, hindi } = collectWords(profile, recentUserWords, register);
  const percent = Math.round(target.hindiShare * 100);

  const lines: string[] = [
    usedPrior
      ? "There is not enough data on this user's language mix yet. Reply in natural, balanced Hinglish (about half Hindi, half English by word count)."
      : `Reply in Hinglish, about ${percent}% Hindi and ${100 - percent}% English by word count, matching how the user speaks.`,
    outputScript === "roman"
      ? "Write Hindi words in Roman script (for example: aapka payment kal due hai), never in Devanagari."
      : "Write Hindi words in Devanagari script and English words in Latin script.",
    switchingLine(target.switchRate),
  ];
  if (english.length > 0) {
    lines.push(`The user says these words in English, so keep them in English: ${english.join(", ")}.`);
  }
  if (hindi.length > 0) {
    lines.push(`The user also uses these Hindi words; reuse them sparingly: ${hindi.join(", ")}.`);
  }
  lines.push(TONE[register]);
  lines.push(
    `Keep the reply to at most ${maxSentences} short sentence${maxSentences === 1 ? "" : "s"}, because it will be spoken aloud.`,
  );

  const avoid: string[] = [];
  if (outputScript === "roman") avoid.push("Devanagari script");
  if (register !== "casual") avoid.push("copying the user's slang (yaar, bhai, bro)");

  return {
    target,
    promptFragment: lines.join(" "),
    borrowedWords: [...english, ...hindi],
    avoid,
    usedPrior,
  };
}
