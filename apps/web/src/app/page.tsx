import Link from "next/link";
import "./landing.css";

const WORDS = [
  { text: "yaar", x: 0, y: 0, w: 48, lane: "h" },
  { text: "meeting", x: 62, y: 54, w: 74, lane: "e" },
  { text: "kal", x: 150, y: 0, w: 40, lane: "h" },
  { text: "hai", x: 204, y: 0, w: 40, lane: "h" },
  { text: "but", x: 258, y: 54, w: 40, lane: "e" },
  { text: "mujhe", x: 312, y: 0, w: 56, lane: "h" },
  { text: "time", x: 382, y: 54, w: 48, lane: "e" },
  { text: "nahi", x: 444, y: 0, w: 48, lane: "h" },
  { text: "pata", x: 506, y: 0, w: 48, lane: "h" },
] as const;

const LINKS = [
  "M48 16C55 16 55 70 62 70",
  "M136 70C143 70 143 16 150 16",
  "M190 16H204",
  "M244 16C251 16 251 70 258 70",
  "M298 70C305 70 305 16 312 16",
  "M368 16C375 16 375 70 382 70",
  "M430 70C437 70 437 16 444 16",
  "M492 16H506",
];

const BARS = Array.from({ length: 28 }, (_, i) => ({
  id: `bar-${i}`,
  height: 16 + ((i * 53) % 32),
  delay: -((i * 37) % 13) / 10,
  teal: i >= 14,
}));

const SPEAKERS = [
  {
    title: "Hindi-base, English nouns",
    said: (
      <>
        mujhe batao mera <span className="ld-en">payment</span> kab <span className="ld-en">due</span> hai
      </>
    ),
    lanes: ["h", "h", "h", "e", "h", "e", "h"],
    reply: "Aapka payment kal due hai. Aaj hi kar dijiye.",
  },
  {
    title: "English-base, Hindi seasoning",
    said: (
      <>
        when is my payment due <span style={{ color: "var(--hi)" }}>yaar</span>
      </>
    ),
    lanes: ["e", "e", "e", "e", "e", "h"],
    reply: "Your payment is due tomorrow, please pay it today ji.",
  },
  {
    title: "Mid-sentence switcher",
    said: (
      <>
        kal to <span className="ld-en">meeting</span> hai <span className="ld-en">but payment</span> kab{" "}
        <span className="ld-en">due</span> hai
      </>
    ),
    lanes: ["h", "h", "e", "h", "e", "e", "h", "e", "h"],
    reply: "Aapka payment due hai, please aaj hi kar dijiye.",
  },
];

const STEPS = [
  {
    title: "Listen",
    body: "Gnani's Prisma turns your speech into text.",
    teal: false,
    icon: "M9 3h6v11H9zM5 11a7 7 0 0 0 14 0M12 18v3",
  },
  {
    title: "Measure",
    body: "Sangam tags each word Hindi, English or neutral, and builds a profile from your last few turns.",
    teal: true,
    icon: "M4 8h12l-3-3M20 16H8l3 3",
  },
  {
    title: "Reply",
    body: "A short reply in your mix is written, checked against it, and spoken by Gnani's Timbre.",
    teal: false,
    icon: "M7 5l12 7-12 7z",
  },
  {
    title: "Check",
    body: "The gap between your mix and the reply's mix is measured, so every claim comes with a number.",
    teal: true,
    icon: "M5 12l4.5 4.5L19 7",
  },
];

const RESULTS = [
  { label: "Tagger accuracy", note: "On [ N ] labelled utterances, with a second annotator." },
  { label: "Mirror gap", note: "Typical agent against Sangam, in points of Hindi share." },
  { label: "Time to first sound", note: "Median and slowest 5 percent, on the hosted setup." },
];

const ENDPOINTS = [
  ["/api/v1/profile", "Measure how someone mixes"],
  ["/api/v1/guide", "Guidance for the next reply"],
  ["/api/v1/check", "Score a draft reply"],
];

export default function Home() {
  return (
    <main className="ld">
      <section className="ld-hero">
        <nav className="ld-nav" aria-label="Main">
          <span className="ld-brand">
            <svg
              width="26"
              height="26"
              viewBox="0 0 32 32"
              fill="none"
              role="img"
              aria-label="Sangam"
              style={{ strokeWidth: 3.4, strokeLinecap: "round" }}
            >
              <path d="M3 9.5C12.5 9.5 12.5 16 19.5 16" style={{ stroke: "var(--hi-s)" }} />
              <path d="M3 22.5C12.5 22.5 12.5 16 19.5 16" style={{ stroke: "var(--en-s)" }} />
              <path d="M19.5 16H29" style={{ stroke: "var(--ink)" }} />
            </svg>
            Sangam
          </span>
          <div className="ld-links">
            <a href="#how">How it works</a>
            <a href="#developers">Developers</a>
            <a href="#results">Results</a>
            <Link href="/playground" className="btn btn-primary btn-sm">
              Try the playground
            </Link>
          </div>
        </nav>

        <h1 className="ld-title">
          A voice agent that talks <span className="hl">like you.</span>
        </h1>
        <p className="ld-sub">
          Most agents answer in textbook Hindi or textbook English. Sangam measures how you really mix the two, then
          replies in the same mix.
        </p>
        <div className="ld-cta">
          <Link href="/playground" className="btn ld-btn-bone">
            Try the playground
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
          <a href="#developers" className="btn ld-btn-ghost">
            Read the docs
          </a>
        </div>

        <div className="ld-stage">
          <div className="ld-card ld-side ld-left">
            <p className="lab">Your mix</p>
            <p className="ld-big">
              67<span>%</span>
            </p>
            <p className="small">Hindi, 6 of 9 words</p>
            <div className="ld-split" aria-hidden="true">
              <i className="h" style={{ flex: 67 }} />
              <i className="e" style={{ flex: 33 }} />
            </div>
            <span className="badge badge-neutral" style={{ alignSelf: "flex-start" }}>
              Mid-sentence switcher
            </span>
          </div>

          <div className="ld-card ld-center">
            <div className="ld-between">
              <p className="lab">You said</p>
              <span className="ld-live">
                <i /> Listening
              </span>
            </div>
            <p className="ld-say">
              yaar <span className="en">meeting</span> kal hai <span className="en">but</span> mujhe{" "}
              <span className="en">time</span> nahi pata
            </p>
            <svg
              className="ld-ribbon"
              viewBox="0 0 560 92"
              role="img"
              aria-label="Two-lane ribbon of the sentence, Hindi words above and English words below"
            >
              <g fill="none" stroke="var(--ctl)" strokeWidth="1.5">
                {LINKS.map((d) => (
                  <path key={d} d={d} />
                ))}
              </g>
              {WORDS.map((word, i) => (
                <g key={word.text} className="w" style={{ animationDelay: `${0.4 + i * 0.28}s` }}>
                  <rect
                    x={word.x}
                    y={word.y}
                    width={word.w}
                    height="32"
                    rx="9"
                    fill={word.lane === "h" ? "var(--hi-t)" : "var(--en-t)"}
                  />
                  <text
                    x={word.x + word.w / 2}
                    y={word.y + 21}
                    textAnchor="middle"
                    fill={word.lane === "h" ? "var(--hi)" : "var(--en)"}
                  >
                    {word.text}
                  </text>
                </g>
              ))}
            </svg>
            <div className="ld-eq" aria-hidden="true">
              {BARS.map((bar) => (
                <i
                  key={bar.id}
                  className={bar.teal ? "t" : undefined}
                  style={{ height: bar.height, animationDelay: `${bar.delay}s` }}
                />
              ))}
            </div>
          </div>

          <div className="ld-card ld-side ld-right">
            <p className="lab">Sangam replies</p>
            <p className="ld-reply">Aapka payment due hai, please aaj hi kar dijiye.</p>
            <div className="ld-between">
              <span className="badge badge-ok">gap 4</span>
              <span className="small">Typical agent: gap 67</span>
            </div>
          </div>
        </div>
      </section>

      <div className="ld-wrap ld-built">
        <span className="lab">Built with</span>
        <span>
          Gnani Prisma <em>speech recognition</em>
        </span>
        <span>
          Gnani Timbre <em>speech output</em>
        </span>
        <span>
          Claude <em>reply writing</em>
        </span>
      </div>

      <section className="ld-sec">
        <div className="ld-wrap">
          <p className="ld-eyebrow">Same question, three speakers</p>
          <h2 className="ld-h1">
            Everyone mixes differently. The reply should <u>follow</u>.
          </h2>
          <p className="ld-lead">
            Illustrative examples. Each speaker asks when a payment is due and hears an answer in their own mix.
          </p>
          <div className="ld-grid">
            {SPEAKERS.map((speaker) => (
              <div key={speaker.title} className="ld-tile ld-reveal">
                <p className="h3">{speaker.title}</p>
                <p className="ld-line">{speaker.said}</p>
                <div
                  className="ld-ln"
                  style={{ gridTemplateColumns: `repeat(${speaker.lanes.length}, 1fr)` }}
                  aria-hidden="true"
                >
                  {speaker.lanes.map((lane, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: a fixed illustration, never reordered
                    <i key={i} className={lane} style={{ gridColumn: i + 1 }} />
                  ))}
                </div>
                <hr style={{ border: 0, height: 1, background: "var(--line)", margin: 0 }} />
                <p className="lab">Sangam replies</p>
                <p className="ld-line" style={{ fontSize: 18 }}>
                  {speaker.reply}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ld-sec ld-sec-alt" id="how">
        <div className="ld-wrap">
          <p className="ld-eyebrow">How it works</p>
          <h2 className="ld-h1">Listen, measure, reply.</h2>
          <p className="ld-lead">Four steps, and the last one is what makes the claim checkable.</p>
          <div className="ld-grid">
            {STEPS.map((step) => (
              <div key={step.title} className="ld-tile ld-reveal">
                <span className={step.teal ? "ic en" : "ic"}>
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    aria-hidden="true"
                    style={{
                      fill: "none",
                      stroke: "currentColor",
                      strokeWidth: 1.75,
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                    }}
                  >
                    <path d={step.icon} />
                  </svg>
                </span>
                <p className="h3">{step.title}</p>
                <p className="small" style={{ fontSize: 15 }}>
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ld-sec" id="developers">
        <div className="ld-wrap ld-dev">
          <div>
            <p className="ld-eyebrow">For developers</p>
            <h2 className="ld-h1">A layer, not a model.</h2>
            <p className="ld-lead" style={{ marginBottom: 28 }}>
              Sangam sits between the transcript and the reply, so it works with any speech stack and any language
              model.
            </p>
            <div className="ld-ep">
              {ENDPOINTS.map(([path, note]) => (
                <div key={path} className="row">
                  <span className="badge badge-neutral" style={{ background: "var(--hi-t)", color: "var(--hi)" }}>
                    POST
                  </span>
                  <span className="mono" style={{ fontSize: 14 }}>
                    {path}
                  </span>
                  <span className="small" style={{ marginLeft: "auto", fontSize: 13 }}>
                    {note}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <pre className="code" style={{ fontSize: 14, overflow: "auto" }}>
            <span className="k-mut">{"// 1. measure how the user mixes"}</span>
            {"\nconst { profile } = await sangam.profile({ utterances });\n\n"}
            <span className="k-mut">{"// 2. get guidance for the next reply"}</span>
            {'\nconst guide = await sangam.guide({ profile, register: "neutral" });\n\n'}
            <span className="k-mut">{"// 3. write it with your model, then check it"}</span>
            {"\nconst check = await sangam.check({ reply, target: guide.target });"}
          </pre>
        </div>
      </section>

      <section className="ld-results" id="results">
        <div className="ld-wrap">
          <p className="ld-eyebrow" style={{ color: "var(--hero-ink-2)" }}>
            Measured, not claimed
          </p>
          <h2 className="ld-h1">
            We publish the numbers, the sample sizes and the <span className="hl">failures</span>.
          </h2>
          <p className="ld-lead">Results appear here once the evaluation has run. Until then these are placeholders.</p>
          <div className="ld-grid">
            {RESULTS.map((result) => (
              <div key={result.label} className="ld-stat">
                <b>[ value ]</b>
                <p className="lab">{result.label}</p>
                <p className="small">{result.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="ld-wrap ld-foot">
        <p className="small" style={{ maxWidth: 560 }}>
          Sangam is a project for the Great Indian AI Internship Challenge, built on Gnani's Prisma and Timbre speech
          APIs. Audio is processed to make your profile and isn't stored.
        </p>
        <nav aria-label="Footer">
          <a href="#developers">Docs</a>
          <a href="#results">Results</a>
          <a href="https://github.com/Shikhyy/sangam">Source</a>
        </nav>
      </footer>
    </main>
  );
}
