import { mkdirSync, writeFileSync } from "node:fs";
import { buildProfile, tag } from "@sangam/core";
import { createSpeech } from "@sangam/speech";

/**
 * E2 (small), speech speed and round trip, with the real Gnani models:
 *
 *   pnpm eval:speech
 *
 * Each sentence is spoken by Timbre, then the audio is transcribed again by Prisma. It reports how long each step
 * took, and whether the Hindi share of the sentence survived the round trip. Prisma writes Hindi words in Devanagari and
 * English in Latin, so comparing spellings would mislead; the mix is compared with the same tagger Sangam uses. It uses a few seconds of speech credit, one request at a time.
 * Times include the network from the machine that runs it, so numbers from a laptop are not numbers for a server.
 */
const SENTENCES = [
  "mujhe kal bank jaana hai account ka kaam hai",
  "aapka payment due hai please aaj hi kar dijiye",
  "kya aap mujhe bata sakte ho ki order kab aayega",
  "I will check and tell you kal tak ho jayega",
  "yaar meeting kal hai but mujhe time nahi pata",
  "mera phone charge nahi ho raha hai",
  "can you please ek baar phir se check karo",
  "bill zyada aaya hai ye galat hai",
  "slot available hai kya kal subah ke liye",
  "thanks bhai ab sab theek hai",
];

const shareOf = (text: string) => buildProfile([tag(text)], { minTokens: 1 }).hindiShare;
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;
const slowest = (values: number[]) => Math.max(...values);

async function main() {
  process.loadEnvFile(".env");
  const speech = createSpeech(process.env);
  if (!speech) throw new Error("GNANI_API_KEY is not set in .env");

  const rows: {
    text: string;
    speakMs: number;
    hearMs: number;
    heard: string;
    shareGap: number;
    devanagari: boolean;
  }[] = [];
  for (const text of SENTENCES) {
    const t0 = performance.now();
    const spoken = await speech.synthesize(text);
    const speakMs = performance.now() - t0;

    const t1 = performance.now();
    const transcript = await speech.transcribe(new Blob([spoken.audio], { type: spoken.contentType }), "clip.wav");
    const hearMs = performance.now() - t1;

    const shareGap = Math.abs(shareOf(text) - shareOf(transcript.text));
    rows.push({
      text,
      speakMs,
      hearMs,
      heard: transcript.text,
      shareGap,
      devanagari: /[\u0900-\u097F]/.test(transcript.text),
    });
    process.stdout.write(".");
  }

  const speak = rows.map((row) => row.speakMs);
  const hear = rows.map((row) => row.hearMs);
  const summary = {
    clips: rows.length,
    speakMedianMs: Math.round(median(speak)),
    speakSlowestMs: Math.round(slowest(speak)),
    hearMedianMs: Math.round(median(hear)),
    hearSlowestMs: Math.round(slowest(hear)),
    shareGapMean: rows.reduce((sum, row) => sum + row.shareGap, 0) / rows.length,
    shareGapWorst: Math.max(...rows.map((row) => row.shareGap)),
    devanagariTranscripts: rows.filter((row) => row.devanagari).length,
  };

  console.log("\n");
  console.log(
    `Timbre text to audio:  median ${summary.speakMedianMs} ms, slowest ${summary.speakSlowestMs} ms (${summary.clips} clips)`,
  );
  console.log(`Prisma audio to text:  median ${summary.hearMedianMs} ms, slowest ${summary.hearSlowestMs} ms`);
  console.log(
    `Hindi share kept:      off by ${(summary.shareGapMean * 100).toFixed(1)} points on average, ${(summary.shareGapWorst * 100).toFixed(1)} at worst`,
  );
  console.log(`Written in Devanagari: ${summary.devanagariTranscripts} of ${summary.clips} transcripts`);
  for (const row of rows)
    console.log(`  ${(row.shareGap * 100).toFixed(0).padStart(3)}%  ${row.text}  ->  ${row.heard}`);

  mkdirSync("eval/out", { recursive: true });
  writeFileSync("eval/out/speech.json", JSON.stringify({ date: new Date().toISOString(), summary, rows }, null, 2));
  console.log("\nFull results written to eval/out/speech.json");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
