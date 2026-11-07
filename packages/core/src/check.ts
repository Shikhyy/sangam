import type { Target } from "./guide";
import { buildProfile } from "./profile";
import { tag } from "./tagger";
import type { Profile } from "./types";

/** A reply passes when its Hindi share is within this distance of the target. */
export const DEFAULT_TOLERANCE = 0.15;

/** Replies shorter than this are too short to judge fairly ("Theek hai."). */
export const MIN_JUDGED_TOKENS = 4;

// Floating-point slack so a difference of exactly the tolerance passes.
const EPSILON = 1e-9;

export interface CheckOptions {
  tolerance?: number;
  /** Replies with fewer Hindi/English tokens than this are not judged. */
  minTokens?: number;
}

export interface CheckResult {
  replyProfile: Profile;
  deltaHindiShare: number;
  deltaCmi: number;
  deltaSwitchRate: number;
  /** False when the reply was too short to judge; such replies always pass. */
  judged: boolean;
  pass: boolean;
  /**
   * What to tell the model when the draft missed: which way it drifted and how to fix it. Null when the
   * draft passed or was too short to judge. Add it to the next prompt to ask for a closer rewrite.
   */
  advice: string | null;
}

/** The CMI implied by a Hindi share (used to compare a reply with a target). */
const cmiOfShare = (hindiShare: number) => 100 * (1 - Math.max(hindiShare, 1 - hindiShare));

function adviceFor(replyShare: number, target: Target): string {
  const had = Math.round(replyShare * 100);
  const want = Math.round(target.hindiShare * 100);
  const lead = `That draft is ${had}% Hindi, but this speaker is about ${want}% Hindi.`;
  return replyShare > target.hindiShare
    ? `${lead} Rewrite it with more English: keep Hindi for the small connecting words and use the English nouns and verbs the speaker uses. Keep the same meaning.`
    : `${lead} Rewrite it with more Hindi: put Hindi small words and verbs (like hai, kal, nahi, kar) around the English nouns. Keep the same meaning.`;
}

/**
 * Score a draft reply against the mix it should have.
 * "Mirror error" is `deltaHindiShare`: how far the reply's Hindi share is from the target's.
 */
export function check(reply: string, target: Target, options: CheckOptions = {}): CheckResult {
  const { tolerance = DEFAULT_TOLERANCE, minTokens = MIN_JUDGED_TOKENS } = options;

  const replyProfile = buildProfile([tag(reply)], { minTokens });
  const judged = replyProfile.tokenCount >= minTokens;
  const deltaHindiShare = Math.abs(replyProfile.hindiShare - target.hindiShare);

  const pass = !judged || deltaHindiShare <= tolerance + EPSILON;

  return {
    replyProfile,
    deltaHindiShare,
    deltaCmi: Math.abs(replyProfile.cmi - cmiOfShare(target.hindiShare)),
    deltaSwitchRate: Math.abs(replyProfile.switchRate - target.switchRate),
    judged,
    pass,
    advice: pass ? null : adviceFor(replyProfile.hindiShare, target),
  };
}
