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
}

/** The CMI implied by a Hindi share (used to compare a reply with a target). */
const cmiOfShare = (hindiShare: number) => 100 * (1 - Math.max(hindiShare, 1 - hindiShare));

/**
 * Score a draft reply against the mix it should have.
 * "Mirror error" is `deltaHindiShare`: how far the reply's Hindi share is from the target's.
 */
export function check(reply: string, target: Target, options: CheckOptions = {}): CheckResult {
  const { tolerance = DEFAULT_TOLERANCE, minTokens = MIN_JUDGED_TOKENS } = options;

  const replyProfile = buildProfile([tag(reply)], { minTokens });
  const judged = replyProfile.tokenCount >= minTokens;
  const deltaHindiShare = Math.abs(replyProfile.hindiShare - target.hindiShare);

  return {
    replyProfile,
    deltaHindiShare,
    deltaCmi: Math.abs(replyProfile.cmi - cmiOfShare(target.hindiShare)),
    deltaSwitchRate: Math.abs(replyProfile.switchRate - target.switchRate),
    judged,
    pass: !judged || deltaHindiShare <= tolerance + EPSILON,
  };
}
