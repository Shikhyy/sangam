// Makes the narration with Microsoft Edge text to speech (the `edge-tts` command) and measures each clip.
//   node demo/voice.mjs        ->  demo/work/voice/<scene>.mp3 and demo/work/voice/durations.json
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const here = new URL(".", import.meta.url).pathname;
const { voice, rate, scenes } = JSON.parse(readFileSync(`${here}narration.json`, "utf8"));
const dir = `${here}work/voice`;
mkdirSync(dir, { recursive: true });

const durations = {};
for (const scene of scenes) {
  const file = `${dir}/${scene.id}.mp3`;
  execFileSync("edge-tts", ["--voice", voice, `--rate=${rate}`, "--text", scene.text, "--write-media", file], {
    stdio: ["ignore", "ignore", "inherit"],
  });
  const seconds = Number(
    execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file])
      .toString()
      .trim(),
  );
  durations[scene.id] = seconds;
  console.log(`${scene.id}  ${seconds.toFixed(2)} s  ${scene.text.slice(0, 60)}...`);
}
const total = Object.values(durations).reduce((a, b) => a + b, 0);
writeFileSync(`${dir}/durations.json`, JSON.stringify(durations, null, 2));
console.log(`\nNarration total ${total.toFixed(1)} s`);
