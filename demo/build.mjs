// Turns the recorded frames, the Edge TTS voice-over and the Gnani reply clip into the final MP4, with captions.
//   node demo/build.mjs        ->  demo/out/sangam-demo.mp4  (or sangam-demo-rehearsal.mp4 for a rehearsal)
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const here = new URL(".", import.meta.url).pathname;
const work = `${here}work`;
const meta = JSON.parse(readFileSync(`${work}/meta.json`, "utf8"));
const narration = JSON.parse(readFileSync(`${here}narration.json`, "utf8"));
mkdirSync(`${here}out`, { recursive: true });

// Stretches cut out of the video (waiting for the model) are removed from the timeline.
const cuts = meta.cuts ?? [];
const cutTime = (t) => t - cuts.reduce((sum, cut) => sum + Math.min(Math.max(t - cut.from, 0), cut.to - cut.from), 0);
const inCut = (t) => cuts.some((cut) => t > cut.from && t < cut.to);
for (const id of Object.keys(meta.starts)) meta.starts[id] = cutTime(meta.starts[id]);
meta.end = cutTime(meta.end);
for (const frame of meta.frames) frame.cut = inCut(frame.t);
for (const frame of meta.frames) frame.t = cutTime(frame.t);
meta.frames = meta.frames.filter((frame) => !frame.cut);

const t0 = meta.starts.s1;
const length = meta.end - t0;
writeFileSync(`${work}/meta.cut.json`, JSON.stringify({ starts: meta.starts, end: meta.end }));
const run = (command, args) => execFileSync(command, args, { stdio: ["ignore", "ignore", "inherit"] });

// 1. Frames to a constant-rate video. Each frame is shown until the next one arrives.
const kept = meta.frames.filter((frame) => frame.t >= t0 - 0.05 && frame.t <= meta.end);
const lines = [];
kept.forEach((frame, index) => {
  const next = kept[index + 1]?.t ?? meta.end;
  lines.push(`file '${frame.file}'`, `duration ${Math.max(0.01, next - frame.t).toFixed(3)}`);
});
lines.push(`file '${kept.at(-1).file}'`);
writeFileSync(`${work}/frames.txt`, lines.join("\n"));
run("ffmpeg", [
  "-y",
  "-hide_banner",
  "-loglevel",
  "error",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  `${work}/frames.txt`,
  "-vf",
  "fps=30,scale=1920:1080:flags=lanczos,format=yuv420p",
  "-c:v",
  "libx264",
  "-crf",
  "20",
  "-preset",
  "medium",
  `${work}/video-only.mp4`,
]);

// 2. Captions.
run("python3", [`${here}captions.py`]);
const captions = JSON.parse(readFileSync(`${work}/captions.json`, "utf8"));

// 3. Mix the voice-over and the Gnani clip, and burn in the captions.
const inputs = ["-i", `${work}/video-only.mp4`];
for (const scene of narration.scenes) inputs.push("-i", `${work}/voice/${scene.id}.mp3`);
inputs.push("-i", `${work}/gnani-reply.wav`);
for (const caption of captions) inputs.push("-i", caption.file);

const filters = [];
const voiceCount = narration.scenes.length;
const mixLabels = [];
narration.scenes.forEach((scene, index) => {
  const delay = Math.round((meta.starts[scene.id] - t0) * 1000);
  filters.push(`[${index + 1}:a]adelay=${delay}|${delay},volume=1.0[v${index}]`);
  mixLabels.push(`[v${index}]`);
});
const gnaniDelay = Math.round((meta.starts.s4 - t0 + meta.gnaniAt) * 1000);
filters.push(`[${voiceCount + 1}:a]aresample=48000,adelay=${gnaniDelay}|${gnaniDelay},volume=0.9[g]`);
mixLabels.push("[g]");
filters.push(
  `${mixLabels.join("")}amix=inputs=${mixLabels.length}:normalize=0:duration=longest,loudnorm=I=-16:TP=-1.5:LRA=11[a]`,
);

let last = "[0:v]";
captions.forEach((caption, index) => {
  const input = voiceCount + 2 + index;
  const label = `[c${index}]`;
  filters.push(`${last}[${input}:v]overlay=0:0:enable='between(t,${caption.start},${caption.end})'${label}`);
  last = label;
});

const final = meta.rehearsal ? "sangam-demo-rehearsal.mp4" : "sangam-demo.mp4";
run("ffmpeg", [
  "-y",
  "-hide_banner",
  "-loglevel",
  "error",
  ...inputs,
  "-filter_complex",
  filters.join(";"),
  "-map",
  last,
  "-map",
  "[a]",
  "-c:v",
  "libx264",
  "-crf",
  "21",
  "-preset",
  "medium",
  "-c:a",
  "aac",
  "-b:a",
  "160k",
  "-t",
  length.toFixed(2),
  "-movflags",
  "+faststart",
  `${here}out/${final}`,
]);

const size = (Number(execFileSync("stat", ["-f", "%z", `${here}out/${final}`]).toString()) / 1e6).toFixed(1);
console.log(
  `demo/out/${final}  ${length.toFixed(1)} s  ${size} MB${meta.rehearsal ? "  (REHEARSAL, not for submission)" : ""}`,
);
