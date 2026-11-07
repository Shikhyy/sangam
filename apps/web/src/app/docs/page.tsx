import type { Metadata } from "next";
import { Footer } from "../../components/Footer";
import { Nav } from "../../components/Nav";
import { TryIt } from "../../components/TryIt";
import "../landing.css";
import "../pages.css";

export const metadata: Metadata = {
  title: "Docs · Sangam",
  description: "The Sangam API: measure how someone mixes Hindi and English, guide the next reply, and check it.",
};

const SECTIONS = [
  { id: "quickstart", label: "Quickstart" },
  { id: "try", label: "Try it" },
  { id: "profile", label: "Profile" },
  { id: "guide", label: "Guide" },
  { id: "check", label: "Check" },
  { id: "keys", label: "Keys and limits" },
  { id: "errors", label: "Errors" },
  { id: "roadmap", label: "Roadmap" },
];

const QUICKSTART = `// 1. Measure how the person mixes Hindi and English
const { profile } = await post("/api/v1/profile", { utterances: history });

// 2. Get guidance for the next reply
const guide = await post("/api/v1/guide", { profile, register: "neutral", outputScript: "roman" });

// 3. Put guide.promptFragment in your model's system prompt, write the reply, then check it
const result = await post("/api/v1/check", { reply, target: guide.target });
if (!result.pass) {
  // The reply drifted from the person's mix. Ask the model again, or send it anyway.
}

async function post(path, body) {
  const response = await fetch("https://YOUR_HOST" + path, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer YOUR_KEY" },
    body: JSON.stringify(body),
  });
  return response.json();
}`;

const PROFILE_REQUEST = `curl -X POST https://YOUR_HOST/api/v1/profile \\
  -H "content-type: application/json" \\
  -H "authorization: Bearer YOUR_KEY" \\
  -d '{"utterances": ["yaar meeting kal hai but mujhe time nahi pata"]}'`;

const PROFILE_RESPONSE = `{
  "tokens": [[{ "text": "yaar", "lang": "HI", "source": "lexicon" }, "..."]],
  "profile": {
    "tokenCount": 9,
    "hindiShare": 0.67,
    "cmi": 33.33,
    "switchRate": 0.75,
    "matrixLanguage": "HI",
    "styleType": "Mid-sentence switcher",
    "confidence": "low",
    "signatureWords": ["meeting", "but", "time"]
  }
}`;

const GUIDE_REQUEST = `curl -X POST https://YOUR_HOST/api/v1/guide \\
  -H "content-type: application/json" \\
  -H "authorization: Bearer YOUR_KEY" \\
  -d '{ "profile": { ...the profile from /profile... },
        "register": "neutral",
        "outputScript": "roman",
        "recentUserWords": ["meeting", "time"] }'`;

const GUIDE_RESPONSE = `{
  "target": { "hindiShare": 0.5, "switchRate": 0.2, "matrixLanguage": "balanced" },
  "promptFragment": "There is not enough data on this user's language mix yet. Reply in natural, balanced Hinglish (about half Hindi, half English by word count). Write Hindi words in Roman script ... Keep the reply to at most 2 short sentences, because it will be spoken aloud.",
  "borrowedWords": ["meeting", "but", "time"],
  "avoid": ["Devanagari script", "copying the user's slang (yaar, bhai, bro)"],
  "usedPrior": true
}`;

const CHECK_REQUEST = `curl -X POST https://YOUR_HOST/api/v1/check \\
  -H "content-type: application/json" \\
  -H "authorization: Bearer YOUR_KEY" \\
  -d '{ "reply": "Aapka payment due hai, please aaj hi kar dijiye.",
        "target": { "hindiShare": 0.5, "switchRate": 0.2, "matrixLanguage": "balanced" } }'`;

const CHECK_RESPONSE = `{
  "replyProfile": { "hindiShare": 0.63, "styleType": "Mid-sentence switcher", "...": "..." },
  "deltaHindiShare": 0.13,
  "deltaCmi": 12.5,
  "deltaSwitchRate": 0.37,
  "judged": true,
  "pass": true,
  "advice": null
}`;

const ERRORS = [
  ["400", "invalid_request", "A field is missing, too long or the wrong type. The message says which."],
  ["401", "unauthorized", "Keys are switched on and the key is missing or not valid."],
  ["413", "too_large", "The body is over 20,000 bytes."],
  ["429", "rate_limited", "Too many requests. Wait for the Retry-After seconds."],
];

function Code({ children }: { children: string }) {
  return (
    <pre className="dc-code">
      <code>{children}</code>
    </pre>
  );
}

export default function DocsPage() {
  return (
    <main className="vs">
      <Nav current="docs" />

      <div className="dc-head">
        <p className="dc-kick">API reference</p>
        <h1>
          Build with <em>Sangam</em>
        </h1>
        <p>
          Three calls keep your voice agent in the same Hindi and English mix as the person it is talking to. They are
          plain JSON over HTTPS, they work with any speech stack and any language model, and nothing you send is stored.
        </p>
      </div>

      <div className="dc-layout">
        <nav className="dc-toc" aria-label="On this page">
          {SECTIONS.map((section) => (
            <a key={section.id} href={`#${section.id}`}>
              {section.label}
            </a>
          ))}
        </nav>

        <div className="dc-body">
          <section id="quickstart">
            <h2>Quickstart</h2>
            <p>
              Measure, guide, then check. Sangam sits between the transcript and the reply, so you keep your own speech
              provider and your own model.
            </p>
            <Code>{QUICKSTART}</Code>
          </section>

          <section id="try">
            <h2>Try it</h2>
            <p>This calls the real endpoint on this site and shows the profile it returns.</p>
            <TryIt />
          </section>

          <section id="profile">
            <h2>
              <span className="dc-method">POST</span> /api/v1/profile
            </h2>
            <p>
              Measure how someone mixes the two languages. Send 1 to 10 utterances, oldest first, each up to 1,000
              characters and 5,000 in total. Newer utterances count for more, so the profile follows the person as they
              change. <code>decay</code> (0 to 1, default 0.6) sets how fast older ones fade.
            </p>
            <Code>{PROFILE_REQUEST}</Code>
            <Code>{PROFILE_RESPONSE}</Code>
            <p>
              <code>tokens</code> has one list per utterance, tagged Hindi, English or neutral, so you can draw the mix.
              With fewer than 20 words <code>confidence</code> is <code>low</code>. The examples on this page round
              numbers to two decimals; the API returns full precision.
            </p>
          </section>

          <section id="guide">
            <h2>
              <span className="dc-method">POST</span> /api/v1/guide
            </h2>
            <p>
              Turn a profile into guidance for the next reply: a target mix and a sentence to put in your prompt.{" "}
              <code>register</code> is <code>formal</code>, <code>neutral</code> or <code>casual</code>, and caps how
              often the reply switches language inside a sentence. <code>outputScript</code> is <code>roman</code> or{" "}
              <code>devanagari</code>.
            </p>
            <Code>{GUIDE_REQUEST}</Code>
            <Code>{GUIDE_RESPONSE}</Code>
            <p>
              When the profile has low confidence, <code>usedPrior</code> is true and the target is a balanced mix, so
              one short sentence never swings the agent too far. The target never goes below 10% or above 90% Hindi.
            </p>
          </section>

          <section id="check">
            <h2>
              <span className="dc-method">POST</span> /api/v1/check
            </h2>
            <p>
              Score a draft reply against the target. <code>deltaHindiShare</code> is the gap in Hindi share, as a
              fraction. <code>pass</code> is true when it is within 0.15. Replies with fewer than 4 Hindi or English
              words are too short to judge, so they return <code>judged: false</code> and pass. When a draft fails,{" "}
              <code>advice</code> says which way it drifted and how to fix it. Add it to your next prompt to ask for a
              closer rewrite.
            </p>
            <Code>{CHECK_REQUEST}</Code>
            <Code>{CHECK_RESPONSE}</Code>
          </section>

          <section id="keys">
            <h2>Keys and limits</h2>
            <p>
              Send your key as <code>Authorization: Bearer YOUR_KEY</code> or <code>X-Sangam-Key</code>. A server can
              run open, which is how local development and this demo work, or with keys switched on. Every key, or every
              visitor on an open server, gets 60 requests a minute by default. Bodies are limited to 20,000 bytes.
            </p>
            <p>Hosted keys, plans and a usage dashboard are on the roadmap below. Nothing you send is stored.</p>
          </section>

          <section id="errors">
            <h2>Errors</h2>
            <p>
              Errors are always <code>{'{ "error": { "code", "message" } }'}</code>.
            </p>
            <table className="dc-table">
              <thead className="sr-only">
                <tr>
                  <th>Status</th>
                  <th>Code</th>
                  <th>Meaning</th>
                </tr>
              </thead>
              <tbody>
                {ERRORS.map(([status, code, meaning]) => (
                  <tr key={code}>
                    <td>{status}</td>
                    <td>
                      <code>{code}</code>
                    </td>
                    <td>{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section id="roadmap">
            <h2>Roadmap</h2>
            <p>These are plans, not features you can use today.</p>
            <ul className="dc-list">
              <li>Hosted API keys with usage and a dashboard</li>
              <li>A JavaScript SDK</li>
              <li>More languages mixed with English, starting with Tamil and Bengali</li>
              <li>A streaming voice session that does all three steps for you</li>
              <li>Saved agents with your own persona and tone</li>
            </ul>
          </section>
        </div>
      </div>

      <Footer />
    </main>
  );
}
