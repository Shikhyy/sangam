import Link from "next/link";
import { GradientField } from "../components/GradientField";
import { Instrument } from "../components/Instrument";
import { Nav } from "../components/Nav";
import { Reveal } from "../components/Reveal";
import "./landing.css";

const HEADLINE: { word: string; italic?: boolean }[] = [
  { word: "A" },
  { word: "voice" },
  { word: "agent" },
  { word: "that" },
  { word: "talks" },
  { word: "like", italic: true },
  { word: "you.", italic: true },
];

const SAID = [
  ["yaar", "h"],
  ["meeting", "e"],
  ["kal", "h"],
  ["hai", "h"],
  ["but", "e"],
  ["mujhe", "h"],
  ["time", "e"],
  ["nahi", "h"],
  ["pata", "h"],
] as const;

const STEPS = [
  { n: "01", title: "Listen", body: "Gnani's Prisma turns your speech into text." },
  {
    n: "02",
    title: "Measure",
    body: "Sangam tags each word Hindi, English or neutral, and builds a profile from your last few turns.",
  },
  {
    n: "03",
    title: "Reply",
    body: "A short reply in your mix is written, checked against it, and spoken by Gnani's Timbre.",
  },
  {
    n: "04",
    title: "Check",
    body: "The gap between your mix and the reply's mix is measured, so every claim comes with a number.",
  },
];

const ENDPOINTS = [
  ["/api/v1/profile", "Measure how someone mixes"],
  ["/api/v1/guide", "Guidance for the next reply"],
  ["/api/v1/check", "Score a draft reply"],
];

const RESULTS = [
  { label: "Tagger accuracy", note: "On [ N ] labelled utterances, with a second annotator." },
  { label: "Mirror gap", note: "Typical agent against Sangam, in points of Hindi share." },
  { label: "Time to first sound", note: "Median and slowest 5 percent, on the hosted setup." },
];

const Said = () => (
  <>
    {SAID.map(([word, lane], index) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: a fixed sentence, never reordered
      <span key={index} className={lane}>
        {word}{" "}
      </span>
    ))}
  </>
);

const Bracket = ({ side }: { side: "l" | "r" }) => (
  <svg className={`vs-br ${side}`} viewBox="0 0 28 100" preserveAspectRatio="none" aria-hidden="true">
    <path d="M24 2C6 22 6 78 24 98" />
  </svg>
);

export default function Home() {
  return (
    <main className="vs">
      <Nav />

      <div className="vs-wrap vs-top">
        <Instrument>
          <div className="hp-head">
            <h1 className="vs-h1">
              <Bracket side="l" />
              {HEADLINE.map(({ word, italic }, index) => (
                <span key={word} className="bw" style={{ "--i": index } as React.CSSProperties}>
                  {italic ? <em>{word}</em> : word}{" "}
                </span>
              ))}
              <Bracket side="r" />
            </h1>
            <p className="vs-sub">
              Most agents answer in textbook Hindi or textbook English. Sangam measures how you really mix the two, then
              replies in the same mix.
            </p>
            <div className="vs-cta">
              <Link href="/playground" className="btn btn-primary btn-lg">
                Try the playground
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
              <a href="#how" className="btn btn-secondary btn-lg">
                See how it works
              </a>
            </div>
          </div>
        </Instrument>
      </div>

      <section className="vs-sec" id="how">
        <div className="vs-wrap">
          <Reveal>
            <div className="vs-head">
              <h2 className="vs-h2">
                Listen, measure, <em>reply in kind</em>
              </h2>
              <p className="vs-lead">Four steps, and the last one is what makes the claim checkable.</p>
            </div>
          </Reveal>
          <div className="vs-split">
            <Reveal>
              <div className="vs-steps">
                {STEPS.map((step) => (
                  <div key={step.n} className="vs-step">
                    <span className="n">{step.n}</span>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="fr short">
                <GradientField className="fr-bg" />
                <div className="vs-card">
                  <span className="tag">Mid-sentence switcher</span>
                  <p className="said">
                    <Said />
                  </p>
                  <div
                    className="vs-ln"
                    style={{ gridTemplateColumns: `repeat(${SAID.length}, 1fr)` }}
                    aria-hidden="true"
                  >
                    {SAID.map(([word, lane], index) => (
                      <i key={word} className={lane} style={{ gridColumn: index + 1 }} />
                    ))}
                  </div>
                  <div className="vs-row sg">
                    <div className="who">
                      <span>Sangam replies</span>
                    </div>
                    <p>Aapka payment due hai, please aaj hi kar dijiye.</p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="vs-sec" style={{ paddingTop: 0 }}>
        <div className="vs-wrap">
          <Reveal>
            <div className="vs-head">
              <h2 className="vs-h2">
                Never get a <em>mismatched</em> reply again
              </h2>
              <p className="vs-lead">
                Illustrative example. The same question, answered by a typical agent and by Sangam, each scored against
                how the speaker actually talks.
              </p>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="fr short">
              <GradientField className="fr-bg" />
              <div className="vs-card" style={{ width: "min(620px, 100%)" }}>
                <span className="tag">You said</span>
                <p className="said">
                  <Said />
                </p>
                <div className="vs-row">
                  <div className="who">
                    <span>Typical agent</span>
                    <span className="pc-gap off">gap 67</span>
                  </div>
                  <p>Your payment is due tomorrow. Please remit it today.</p>
                </div>
                <div className="vs-row sg">
                  <div className="who">
                    <span>Sangam</span>
                    <span className="pc-gap ok">gap 4</span>
                  </div>
                  <p>Aapka payment due hai, please aaj hi kar dijiye.</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="vs-sec" id="developers" style={{ paddingTop: 0 }}>
        <div className="vs-wrap vs-dev">
          <Reveal>
            <h2 className="vs-h2">
              A layer, <em>not a model.</em>
            </h2>
            <p className="vs-lead">
              Sangam sits between the transcript and the reply, so it works with any speech stack and any language
              model.
            </p>
            <div className="vs-ep">
              {ENDPOINTS.map(([path, note]) => (
                <div key={path}>
                  <span className="post">POST</span>
                  <code>{path}</code>
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="vs-term">
              <div className="bar" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <pre>
                <span className="t c" style={{ "--d": "0.2s" } as React.CSSProperties}>
                  {"// 1. measure how the user mixes"}
                </span>
                <span className="t" style={{ "--d": "0.9s" } as React.CSSProperties}>
                  {"const { profile } = await sangam.profile({ utterances });"}
                </span>
                <span className="t" style={{ "--d": "1.4s" } as React.CSSProperties}>
                  {" "}
                </span>
                <span className="t c" style={{ "--d": "1.6s" } as React.CSSProperties}>
                  {"// 2. get guidance for the next reply"}
                </span>
                <span className="t" style={{ "--d": "2.3s" } as React.CSSProperties}>
                  {"const guide = await sangam.guide({ profile, register: "}
                  <span className="h">"neutral"</span>
                  {" });"}
                </span>
                <span className="t" style={{ "--d": "2.9s" } as React.CSSProperties}>
                  {" "}
                </span>
                <span className="t c" style={{ "--d": "3.1s" } as React.CSSProperties}>
                  {"// 3. write it with your model, then check it"}
                </span>
                <span className="t" style={{ "--d": "3.8s" } as React.CSSProperties}>
                  {"const check = await sangam.check({ reply, target: guide.target });"}
                </span>
              </pre>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="vs-sec" id="results" style={{ paddingTop: 0 }}>
        <div className="vs-wrap">
          <Reveal>
            <div className="vs-head">
              <h2 className="vs-h2">
                Measured, <em>not claimed</em>
              </h2>
              <p className="vs-lead">
                We publish the numbers, the sample sizes and the failures. Results appear here once the evaluation has
                run. Until then these are placeholders.
              </p>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="vs-res">
              {RESULTS.map((result) => (
                <div key={result.label}>
                  <b>[ value ]</b>
                  <h3>{result.label}</h3>
                  <p>{result.note}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="vs-end">
        <div className="vs-wrap">
          <Reveal>
            <h2 className="vs-h2">
              Where two streams <em>meet</em>
            </h2>
            <div className="vs-cta" style={{ opacity: 1, animation: "none" }}>
              <Link href="/playground" className="btn btn-primary btn-lg">
                Try the playground
              </Link>
            </div>
          </Reveal>
        </div>
        <span className="vs-big" aria-hidden="true">
          <em>संगम</em>
        </span>
      </section>

      <footer className="vs-foot">
        <p>
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
