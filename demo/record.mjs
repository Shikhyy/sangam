// Records the demo by driving the real app in headless Chrome and saving the screencast frames.
//
//   1. Start the app in live mode:   SANGAM_MODE=live node apps/web/scripts/next.mjs start -p 3300
//   2. node demo/record.mjs          (final take, needs live replies)
//      node demo/record.mjs --rehearsal   (tests the pipeline with scripted replies; never submit this)
//
// Output: demo/work/frames/*.jpg and demo/work/meta.json (scene start times, the reply text, the Gnani clip).
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const here = new URL(".", import.meta.url).pathname;
const BASE = process.env.BASE ?? "http://localhost:3300";
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const REHEARSAL = process.argv.includes("--rehearsal");
const PORT = 9333;
const SENTENCE =
  "yaar meeting kal hai but mujhe time nahi pata, boss ko bolna padega ki deadline thodi push karni padegi because abhi tak report ready nahi hai";

const durations = JSON.parse(readFileSync(`${here}work/voice/durations.json`, "utf8"));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---- Refuse to record a final take against anything but the real models.
const health = await fetch(`${BASE}/api/health`).then((response) => response.json());
if (health.reply === "mock" && !REHEARSAL) {
  console.error(
    `The app at ${BASE} is in mock mode (replies are scripted). Start it with SANGAM_MODE=live, or pass --rehearsal to test the pipeline.`,
  );
  process.exit(1);
}
if (health.reply === "misconfigured") {
  console.error("The app says its reply provider is misconfigured.");
  process.exit(1);
}
console.log(`App at ${BASE}: reply=${health.reply}, speech=${health.speech}${REHEARSAL ? "  (REHEARSAL)" : ""}`);

const frameDir = `${here}work/frames`;
rmSync(frameDir, { recursive: true, force: true });
mkdirSync(frameDir, { recursive: true });

// ---- Start Chrome and connect.
const profile = `${here}work/chrome-profile`;
const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    ...(process.env.ANGLE === "metal"
      ? ["--use-angle=metal", "--ignore-gpu-blocklist"]
      : ["--disable-gpu", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]),
    "--hide-scrollbars",
    "--autoplay-policy=no-user-gesture-required",
    "--window-size=1280,720",
    "about:blank",
  ],
  { stdio: "ignore" },
);
const stop = () => chrome.kill();
process.on("exit", stop);

let targets;
for (let attempt = 0; attempt < 50; attempt++) {
  try {
    targets = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((response) => response.json());
    if (targets.some((target) => target.type === "page")) break;
  } catch {}
  await sleep(200);
}
const page = targets?.find((target) => target.type === "page");
if (!page) throw new Error("Chrome did not start");

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});

let nextId = 1;
const waiting = new Map();
const frames = [];
let clockOffset = null; // browser clock minus this machine's clock, found from the first frame

socket.onmessage = (message) => {
  const data = JSON.parse(message.data);
  if (data.id && waiting.has(data.id)) {
    waiting.get(data.id)(data);
    waiting.delete(data.id);
  } else if (data.method === "Page.screencastFrame") {
    const { data: jpeg, metadata, sessionId } = data.params;
    if (clockOffset === null) clockOffset = metadata.timestamp - Date.now() / 1000;
    const name = `${frameDir}/${String(frames.length).padStart(6, "0")}.jpg`;
    writeFileSync(name, Buffer.from(jpeg, "base64"));
    frames.push({ t: metadata.timestamp, file: name });
    void send("Page.screencastFrameAck", { sessionId });
  }
};

const send = (method, params = {}) =>
  new Promise((resolve) => {
    const id = nextId++;
    waiting.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
  });

const js = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.result?.exceptionDetails)
    throw new Error(`${result.result.exceptionDetails.text} in ${expression.slice(0, 80)}`);
  return result.result?.result?.value;
};

// Keeps the page asking for frames, so the screencast runs smoothly instead of only when something changes.
const heartbeat = `(() => { if (window.__beat) return; window.__beat = true; const tick = () => requestAnimationFrame(tick); tick(); })()`;

const go = async (path) => {
  await send("Page.navigate", { url: `${BASE}${path}` });
  await sleep(250);
  for (let attempt = 0; attempt < 40; attempt++) {
    if (await js(`document.readyState === "complete"`)) break;
    await sleep(150);
  }
  await js(heartbeat);
  await sleep(250);
};

const clickBy = async (finder) => {
  const point = await js(
    `(() => { const el = ${finder}; if (!el) return null; el.scrollIntoView({block:"center"}); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`,
  );
  if (!point) throw new Error(`could not find ${finder}`);
  await sleep(300);
  const at = await js(
    `(() => { const el = ${finder}; const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`,
  );
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: at.x, y: at.y });
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: at.x, y: at.y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: at.x, y: at.y, button: "left", clickCount: 1 });
};

const smoothScroll = (top) => js(`window.scrollTo({ top: ${top}, behavior: "smooth" })`);

// ---- Record.
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1280,
  height: 720,
  deviceScaleFactor: Number(process.env.DSF ?? 1.5),
  mobile: false,
});
await send("Page.startScreencast", {
  format: "jpeg",
  quality: Number(process.env.Q ?? 88),
  maxWidth: Number(process.env.SW ?? 1920),
  maxHeight: Number(process.env.SW ?? 1920) * 0.5625,
  everyNthFrame: 1,
});

const starts = {};
const mark = (id) => {
  starts[id] = Date.now() / 1000 + (clockOffset ?? 0);
  console.log(`-- ${id}`);
};
const until = async (id, extra = 0.3) => {
  const end = starts[id] + durations[id] + extra;
  const wait = end - (Date.now() / 1000 + (clockOffset ?? 0));
  if (wait > 0) await sleep(wait * 1000);
};

if (process.argv.includes("--bench")) {
  await go(process.env.BENCH_PATH ?? "/");

  const before = frames.length;
  await sleep(6000);
  console.log(
    `bench: ${((frames.length - before) / 6).toFixed(1)} frames per second (ANGLE=${process.env.ANGLE ?? "swiftshader"}, DSF=${process.env.DSF ?? 1.5})`,
  );
  stop();
  process.exit(0);
}

const meta = { rehearsal: REHEARSAL, base: BASE, reply: health.reply, sentence: SENTENCE };

// s1: the home page
await go("/");
mark("s1");
await sleep(6500);
await smoothScroll(260);
await until("s1");

// s2: type a sentence the way a person really talks
await go("/playground");
mark("s2");
await js(
  `(() => { const i = document.querySelector('input[placeholder^="Say or type"]'); i.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(i, ""); i.dispatchEvent(new Event("input", { bubbles: true })); })()`,
);
await sleep(500);
// Typed at a steady pace that finishes well inside the narration, whatever the machine's speed.
const typingMs = 6500;
const typingStart = Date.now();
let typed = 0;
while (typed < SENTENCE.length) {
  const due = Math.ceil(SENTENCE.length * Math.min(1, (Date.now() - typingStart) / typingMs));
  if (due > typed) {
    await send("Input.insertText", { text: SENTENCE.slice(typed, due) });
    typed = due;
  }
  await sleep(40);
}
await smoothScroll(220);
await until("s2");

// s3: ask for both replies. Waiting for the model is cut out of the video, so the replies are already there
// when the narration reaches them.
meta.cuts = [];
// A short reply keeps the Gnani voice short too, and shows the length setting.
await clickBy(`[...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "1 sentence")`);
await sleep(400);
const askForReplies = () =>
  clickBy(`[...document.querySelectorAll("button")].find((b) => b.textContent.includes("Get replies"))`);
await askForReplies();
await sleep(500);
const cutFrom = Date.now() / 1000 + (clockOffset ?? 0);
// The free models are shared and often busy, so ask again a few times. Waiting is cut out of the video.
let replies = null;
let lastSeen = "";
let steady = 0;
for (let attempt = 1; attempt <= 12; attempt++) {
  const deadline = Date.now() + 60_000;
  steady = 0;
  lastSeen = "";
  while (Date.now() < deadline) {
    await sleep(700);
    replies = await js(
      `(() => { const t = [...document.querySelectorAll(".reply-text")].map((e) => e.textContent.trim()); const err = document.querySelector('[role="alert"]'); return { t, err: err ? err.textContent : null }; })()`,
    );
    if (replies.err) break;
    // Replies stream in, so wait until both have stopped changing before using them.
    const whole = replies.t.length === 2 && replies.t.every((text) => text.length > 25);
    const same = whole && replies.t.join("\u0000") === lastSeen;
    steady = same ? steady + 1 : 0;
    lastSeen = whole ? replies.t.join("\u0000") : "";
    if (steady >= 4) break;
  }
  if (steady >= 4 && replies && !replies.err) break;
  console.log(`attempt ${attempt}: ${replies?.err ?? "timed out"}`);
  await sleep(20_000);
  await askForReplies();
}
if (!replies || replies.err || replies.t.some((text) => text.length <= 25)) {
  console.error(
    `No replies after several tries: ${replies?.err ?? "timed out"}. The free models are busy. Try again later.`,
  );
  await send("Page.stopScreencast");
  process.exit(2);
}
meta.typical = replies.t[0];
meta.sangam = replies.t[1];
console.log(`typical: ${meta.typical}\nsangam:  ${meta.sangam}`);
meta.cuts.push({ from: cutFrom, to: Date.now() / 1000 + (clockOffset ?? 0) });
mark("s3");
// Scroll down to the two replies while the narration introduces them.
await smoothScroll(
  await js(`Math.max(0, document.querySelector(".pg-replies").getBoundingClientRect().top + window.scrollY - 150)`),
);

// The Gnani voice is the app's own /api/tts answer for the reply, mixed in later. Fetch it while this scene runs.
const ttsRequest = fetch(`${BASE}/api/tts`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ text: meta.sangam }),
});
await until("s3");

// s4: the Gnani voice
mark("s4");
const tts = await ttsRequest;
if (!tts.ok) {
  console.error(`The app's speech route answered ${tts.status}.`);
  process.exit(3);
}
writeFileSync(`${here}work/gnani-reply.wav`, Buffer.from(await tts.arrayBuffer()));
meta.gnaniSeconds = Number(
  execFileSync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "csv=p=0",
    `${here}work/gnani-reply.wav`,
  ])
    .toString()
    .trim(),
);
await clickBy(`document.querySelector('button[aria-label="Play the sangam reply"]')`);
// The narration comes first, then the Gnani voice speaks the reply.
meta.gnaniAt = durations.s4 + 0.3;
await sleep((meta.gnaniAt + meta.gnaniSeconds + 0.5) * 1000);
durations.s4 = meta.gnaniAt + meta.gnaniSeconds + 0.5 - 0.3;

// s5: the results page
await go("/results");
mark("s5");
await sleep(1500);
await smoothScroll(420);
await until("s5");

// s6: close on the home page
await go("/");
mark("s6");
await until("s6", 1.2);

await send("Page.stopScreencast");
await sleep(500);
meta.starts = starts;
meta.durations = durations;
meta.end = starts.s6 + durations.s6 + 1.2;
meta.frames = frames;
writeFileSync(`${here}work/meta.json`, JSON.stringify(meta, null, 2));
console.log(`\n${frames.length} frames. Video length about ${(meta.end - starts.s1).toFixed(1)} s.`);
stop();
process.exit(0);
