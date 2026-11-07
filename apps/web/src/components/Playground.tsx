"use client";

import { buildProfile, check, guide, mixMetrics, type OutputScript, type Register, tag } from "@sangam/core";
import { PERSONAS, type PersonaKey } from "@sangam/llm";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { earlierUserTokens, type Turn } from "../lib/history";
import { requestReply } from "../lib/reply-client";
import { buildSnippet } from "../lib/snippet";
import { summarize } from "../lib/summary";
import { useVoice } from "../lib/use-voice";
import { type FieldControl, GradientField } from "./GradientField";
import { Nav } from "./Nav";
import { Ribbon } from "./Ribbon";

interface Reply {
  text: string;
  /** How far the reply's Hindi share is from the user's, in points. */
  gap: number | null;
}

interface Replies {
  status: "idle" | "loading" | "done" | "error";
  typical: Reply;
  sangam: Reply;
  provider: string;
  error: string | null;
}

const START_TEXT = "yaar meeting kal hai but mujhe time nahi pata";
const EXAMPLES = ["kal to meeting hai na", "my balance kitna hai", "आपका payment due है"];
const NO_REPLY: Reply = { text: "", gap: null };
const IDLE: Replies = { status: "idle", typical: NO_REPLY, sangam: NO_REPLY, provider: "mock", error: null };
/** A reply within this many points of the user's mix counts as matched. */
const MATCHED_GAP = 15;

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}

function Segmented<T extends string | number>(props: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="seg-field">
      <legend className="small" style={{ color: "var(--ink)", fontWeight: 700, marginBottom: 8, padding: 0 }}>
        {props.label}
      </legend>
      <div className="seg">
        {props.options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            className={option.value === props.value ? "on" : undefined}
            aria-pressed={option.value === props.value}
            onClick={() => props.onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function ReplyCard(props: {
  title: string;
  featured?: boolean;
  reply: Reply;
  status: Replies["status"];
  onPlay: (text: string) => void;
}) {
  const { title, featured, reply, status, onPlay } = props;
  const waiting = status === "idle" ? "Press Get replies to hear this agent." : "Writing a reply…";
  const badge =
    reply.gap === null ? null : (
      <span className={`badge ${reply.gap <= MATCHED_GAP ? "badge-ok" : "badge-warn"}`}>gap {reply.gap}</span>
    );

  return (
    <div
      className="card"
      style={{
        padding: "18px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        ...(featured ? { border: "1.5px solid var(--olive)" } : {}),
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: 24 }}>
        <p className="lab">{title}</p>
        {badge}
      </div>
      <p className="reply-text">{reply.text || waiting}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: "auto" }}>
        <button
          type="button"
          className="round-btn"
          aria-label={`Play the ${title.toLowerCase()} reply`}
          onClick={() => reply.text && onPlay(reply.text)}
        >
          <Icon>
            <path d="M7 5l12 7-12 7z" />
          </Icon>
        </button>
        <div className="wave" aria-hidden="true">
          {[8, 16, 24, 12, 28, 18, 10, 22, 26, 14, 20, 8, 24, 16].map((height, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: decorative bars never reorder
            <i key={index} className={featured && index < 7 ? undefined : "off"} style={{ height }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function Playground() {
  const [text, setText] = useState(START_TEXT);
  const [history, setHistory] = useState<Turn[]>([]);
  const [persona, setPersona] = useState<PersonaKey>("payments");
  const [register, setRegister] = useState<Register>("neutral");
  const [script, setScript] = useState<OutputScript>("roman");
  const [maxSentences, setMaxSentences] = useState(2);
  const [replies, setReplies] = useState<Replies>(IDLE);
  const [notice, setNotice] = useState<string | null>(null);

  const tokens = useMemo(() => tag(text), [text]);
  const metrics = useMemo(() => mixMetrics(tokens), [tokens]);
  const earlier = useMemo(() => earlierUserTokens(history, text), [history, text]);
  const profile = useMemo(() => buildProfile([...earlier, tokens]), [earlier, tokens]);
  const guidance = useMemo(
    () =>
      guide({
        profile,
        register,
        outputScript: script,
        maxSentences,
        recentUserWords: tokens.filter((token) => token.lang !== "X").map((token) => token.text),
      }),
    [profile, register, script, maxSentences, tokens],
  );
  const summary = useMemo(() => summarize(metrics, profile.styleType), [metrics, profile.styleType]);
  const field = useRef<FieldControl>({ share: 0.5, tangle: 0.3, level: 0 });
  const onLevel = useCallback((level: number) => {
    field.current.level = Math.max(field.current.level * 0.6, level);
  }, []);
  const { listening, transcribing, toggleMic, play } = useVoice({ onText: setText, onNotice: setNotice, onLevel });

  useEffect(() => {
    field.current.share = metrics.n > 0 ? metrics.hindiShare : 0.5;
    field.current.tangle = Math.min(1, metrics.switchRate * 1.6);
  }, [metrics]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `text` is a trigger, not a value used here: every keystroke re-energises the painting
  useEffect(() => {
    field.current.level = 1;
    const id = window.setTimeout(() => {
      field.current.level = listening ? 0.55 : 0;
    }, 900);
    return () => window.clearTimeout(id);
  }, [text, listening]);
  const snippet = useMemo(
    () => buildSnippet({ register, outputScript: script, maxSentences }),
    [register, script, maxSentences],
  );

  const send = useCallback(async () => {
    const message = text.trim();
    if (!message || replies.status === "loading") return;

    setNotice(null);
    const nextHistory: Turn[] = [...history, { role: "user", text: message }];
    setHistory(nextHistory);
    setReplies({ ...IDLE, status: "loading" });

    try {
      const [typical, sangam] = await Promise.all([
        requestReply({ mode: "typical", history: nextHistory, persona }, (partial) =>
          setReplies((r) => ({ ...r, typical: { ...r.typical, text: partial } })),
        ),
        requestReply(
          {
            mode: "sangam",
            history: nextHistory,
            persona,
            guidance: guidance.promptFragment,
            targetHindiShare: guidance.target.hindiShare,
          },
          (partial) => setReplies((r) => ({ ...r, sangam: { ...r.sangam, text: partial } })),
        ),
      ]);

      const mine = {
        hindiShare: profile.hindiShare,
        switchRate: profile.switchRate,
        matrixLanguage: profile.matrixLanguage,
      };
      const gap = (reply: string) => Math.round(check(reply, mine).deltaHindiShare * 100);
      setReplies({
        status: "done",
        provider: sangam.provider,
        error: null,
        typical: { text: typical.text, gap: gap(typical.text) },
        sangam: { text: sangam.text, gap: gap(sangam.text) },
      });
      setHistory([...nextHistory, { role: "assistant", text: sangam.text }]);
    } catch (error) {
      setReplies((r) => ({
        ...r,
        status: "error",
        error: error instanceof Error ? error.message : "Couldn't get a reply. Try again.",
      }));
    }
  }, [text, replies.status, history, guidance, profile, persona]);

  const copyCode = () => {
    navigator.clipboard.writeText(snippet).then(
      () => setNotice("Code copied."),
      () => setNotice("Couldn't copy. Select the code and copy it by hand."),
    );
  };

  const live = replies.provider !== "mock";
  const minority = profile.matrixLanguage === "EN" ? "Hindi" : "English";
  const percent = (value: number) => `${Math.round(value * 100)}%`;
  const hasWords = metrics.n > 0;

  return (
    <>
      <Nav current="playground" />
      <div className="pg">
        <div className="pg-title">
          <div>
            <p className="lab">Playground</p>
            <h1>
              Try it on <em>your own words</em>
            </h1>
          </div>
          <span className={`badge ${live ? "badge-ok" : "badge-neutral"}`}>
            <span className="dot" />
            {live ? "live" : "mock mode"}
          </span>
        </div>

        <section className="fr pg-frame" aria-label="You say">
          <GradientField className="fr-bg" control={field} />
          <div className="pc pg-card">
            <div className="pg-hero-top">
              <p className="lab">You say</p>
              <div className="meta">
                <span>
                  <Icon>
                    <path d="M4 7h16M4 12h10M4 17h13" />
                  </Icon>
                  {metrics.n} {metrics.n === 1 ? "word" : "words"}
                </span>
                {hasWords && profile.confidence === "low" ? (
                  <span>
                    <Icon>
                      <path d="M12 4l9 16H3zM12 10v4M12 17h.01" />
                    </Icon>
                    low confidence
                  </span>
                ) : null}
              </div>
            </div>

            <form
              className="pg-say"
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
            >
              <label htmlFor="say" className="sr-only">
                Say or type something in Hinglish
              </label>
              <input
                id="say"
                className="pg-input"
                value={text}
                placeholder="Say or type something in your own Hinglish"
                autoComplete="off"
                onChange={(event) => {
                  setText(event.target.value);
                  setNotice(null);
                }}
              />
              <button
                type="button"
                className="btn btn-secondary btn-icon pg-mic"
                aria-pressed={listening}
                disabled={transcribing}
                aria-label={listening ? "Stop listening" : "Speak"}
                onClick={toggleMic}
              >
                <Icon>
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                </Icon>
              </button>
            </form>

            <div className="pg-examples">
              <span className="small">Try</span>
              {EXAMPLES.map((example) => (
                <button key={example} type="button" className="pg-chip" onClick={() => setText(example)}>
                  {example}
                </button>
              ))}
            </div>

            <div className="pg-summary">
              <p className="say" style={{ maxWidth: 900 }} aria-live="polite">
                {summary.map((part, index) =>
                  part.highlight ? (
                    // biome-ignore lint/suspicious/noArrayIndexKey: the parts are rebuilt as a whole each time
                    <span key={index} className="hl">
                      {part.text}
                    </span>
                  ) : (
                    // biome-ignore lint/suspicious/noArrayIndexKey: the parts are rebuilt as a whole each time
                    <span key={index}>{part.text}</span>
                  ),
                )}
              </p>
              <button type="button" className="btn btn-primary" onClick={() => void send()}>
                Get replies
                <Icon>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </Icon>
              </button>
            </div>

            {notice ? (
              <p className="small" role="status">
                {notice}
              </p>
            ) : null}
          </div>
        </section>

        <main className="pg-main">
          <div className="pg-col">
            <section className="card" style={{ padding: "20px 24px" }} aria-label="How you mix">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 10,
                }}
              >
                <p className="lab">How you mix</p>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <span className="small" style={{ fontSize: 13 }}>
                    <span className="chip chip-hi" style={{ height: 22, fontSize: 12, marginRight: 6 }}>
                      हिंदी
                    </span>
                    upper lane
                  </span>
                  <span className="small" style={{ fontSize: 13 }}>
                    <span className="chip chip-en" style={{ height: 22, fontSize: 12, marginRight: 6 }}>
                      English
                    </span>
                    lower lane
                  </span>
                </div>
              </div>
              <Ribbon tokens={tokens} />
              <div className="pg-stats">
                <div className="tile">
                  <p className="stat">{hasWords ? percent(metrics.hindiShare) : "-"}</p>
                  <p className="lab" style={{ marginTop: 6 }}>
                    Hindi share
                  </p>
                </div>
                <div className="tile">
                  <p className="stat">{hasWords ? metrics.cmi.toFixed(1) : "-"}</p>
                  <p className="lab" style={{ marginTop: 6 }}>
                    Mixing index
                  </p>
                </div>
                <div className="tile">
                  <p className="stat">{hasWords ? percent(metrics.switchRate) : "-"}</p>
                  <p className="lab" style={{ marginTop: 6 }}>
                    Switch rate
                  </p>
                </div>
              </div>
            </section>

            <section className="pg-replies" aria-label="Compare replies" aria-live="polite">
              <ReplyCard title="Typical agent" reply={replies.typical} status={replies.status} onPlay={play} />
              <ReplyCard title="Sangam" featured reply={replies.sangam} status={replies.status} onPlay={play} />
            </section>
            {replies.status === "error" ? (
              <p className="small" role="alert" style={{ color: "var(--bad)" }}>
                {replies.error}
              </p>
            ) : null}
          </div>

          <aside className="pg-col" aria-label="Profile and settings">
            <section
              className="card"
              style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}
            >
              <p className="lab">Your style</p>
              <div className="row">
                <span className="ic">
                  <Icon>
                    <path d="M4 8h12l-3-3M20 16H8l3 3" />
                  </Icon>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ font: "700 16px/1.3 var(--font-ui)", color: "var(--ink)" }}>
                    {hasWords ? profile.styleType : "Not yet known"}
                  </p>
                  <p className="small" style={{ fontSize: 13 }}>
                    Based on {profile.tokenCount} {profile.tokenCount === 1 ? "word" : "words"}
                  </p>
                </div>
                {hasWords && profile.confidence === "low" ? <span className="badge badge-warn">low</span> : null}
              </div>
              <div className="row">
                <span className="ic en">
                  <Icon>
                    <path d="M5 6h14M9 6v12M15 12h4M15 18h4" />
                  </Icon>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ font: "700 16px/1.3 var(--font-ui)", color: "var(--ink)" }}>
                    {profile.signatureWords.length > 0 ? profile.signatureWords.join(", ") : "None yet"}
                  </p>
                  <p className="small" style={{ fontSize: 13 }}>
                    You say these in {minority}
                  </p>
                </div>
              </div>
            </section>

            <section
              className="card"
              style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}
            >
              <p className="lab">Reply settings</p>
              <Segmented
                label="Agent"
                value={persona}
                onChange={setPersona}
                options={(Object.keys(PERSONAS) as PersonaKey[]).map((key) => ({
                  value: key,
                  label: PERSONAS[key].label,
                }))}
              />
              <Segmented
                label="Register"
                value={register}
                onChange={setRegister}
                options={[
                  { value: "formal", label: "Formal" },
                  { value: "neutral", label: "Neutral" },
                  { value: "casual", label: "Casual" },
                ]}
              />
              <Segmented
                label="Hindi script"
                value={script}
                onChange={setScript}
                options={[
                  { value: "roman", label: "Roman" },
                  { value: "devanagari", label: "देवनागरी" },
                ]}
              />
              <Segmented
                label="Length"
                value={maxSentences}
                onChange={setMaxSentences}
                options={[
                  { value: 1, label: "1 sentence" },
                  { value: 2, label: "2 sentences" },
                ]}
              />
            </section>

            <section
              className="card"
              style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p className="lab">Use it in your app</p>
                <button type="button" className="btn btn-secondary btn-sm" onClick={copyCode}>
                  <Icon>
                    <rect x="8" y="8" width="11" height="11" rx="2" />
                    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
                  </Icon>
                  Copy
                </button>
              </div>
              <pre className="code" style={{ margin: 0 }}>
                <code>{snippet}</code>
              </pre>
              <p className="small" style={{ fontSize: 13 }}>
                {live
                  ? "Your text is sent to the language model provider to write replies."
                  : "Mock mode: replies are scripted. Nothing you type is stored."}
              </p>
            </section>
          </aside>
        </main>
      </div>
    </>
  );
}
