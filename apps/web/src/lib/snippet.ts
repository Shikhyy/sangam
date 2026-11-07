import type { OutputScript, Register } from "@sangam/core";

export interface SnippetOptions {
  register: Register;
  outputScript: OutputScript;
  maxSentences: number;
}

/** The code a developer would write to get the same guidance the playground is using. */
export function buildSnippet({ register, outputScript, maxSentences }: SnippetOptions): string {
  return [
    "// from the settings on this page",
    "const guide = await sangam.guide({",
    "  profile,",
    `  register: "${register}",`,
    `  outputScript: "${outputScript}",`,
    `  maxSentences: ${maxSentences},`,
    "});",
  ].join("\n");
}
