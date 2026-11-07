"use client";

import { buildProfile, check, guide, mixMetrics, tag } from "@sangam/core";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { earlierUserTokens, type Turn } from "../lib/history";
import { requestReply } from "../lib/reply-client";
import { useCount } from "../lib/use-count";
import { useVoice } from "../lib/use-voice";
import { type FieldControl, GradientField } from "./GradientField";
import { Ribbon } from "./Ribbon";

const START = "yaar meeting kal hai but mujhe time nahi pata";
const EXAMPLES = ["kal to meeting hai na", "my balance kitna hai", "आपका payment due है"];
/** A reply within this many points of the user's mix counts as matched. */
const MATCHED_GAP = 15;

interface Reply {
  text: string;
  gap: number | null;
}
interface Replies {
  status: "idle" | "loading" | "done" | "error";
  typical: Reply;
  sangam: Reply;
  error: string | null;
}
const NO_REPLY: Reply = { text: "", gap: null };
const IDLE: Replies = { status: "idle", typical: NO_REPLY, sangam: NO_REPLY, error: null };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/**
 * The product in a frame. The gradient behind the card is drawn from the sentence you type or say:
 * how much of it is warm is your Hindi share, how folded and finely lined it is is how often you
 * switch, and how fast it moves is how much you are talking.
 */
export function Instrument({ children }: { children?: ReactNode }) {
  const [text, setText] = useState(START);
  const [history, setHistory] = useState<Turn[]>([]);
  const [replies, setReplies] = useState<Replies>(IDLE);
  const [notice, setNotice] = useState<string | null>(null);
  const control = useRef<FieldControl>({ share: 0.5, tangle: 0.3, level: 0 });
  const onLevel = useCallback((level: number) => {
    control.current.level = Math.max(control.current.level * 0.6, level);
  }, []);
  const { listening, transcribing, toggleMic, play } = useVoice({ onText: setText, onNotice: setNotice, onLevel });

  const tokens = useMemo(() => tag(text), [text]);
  const metrics = useMemo(() => mixMetrics(tokens), [tokens]);
  const earlier = useMemo(() => earlierUserTokens(history, text), [history, text]);
  const profile = useMemo(() => buildProfile([...earlier, tokens]), [earlier, tokens]);
  const guidance = useMemo(
    () =>
      guide({
        profile,
        register: "neutral",
        outputScript: "roman",
        maxSentences: 2,
        recentUserWords: tokens.filter((token) => token.lang !== "X").map((token) => token.text),
      }),
    [profile, tokens],
  );

  useEffect(() => {
    control.current.share = metrics.n > 0 ? metrics.hindiShare : 0.5;
    control.current.tangle = Math.min(1, metrics.switchRate * 1.6);
  }, [metrics]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `text` is a trigger, not a value used here: every keystroke re-energises the gradient
  useEffect(() => {
    control.current.level = 1;
    const id = window.setTimeout(() => {
      control.current.level = listening ? 0.55 : 0;
    }, 900);
    return () => window.clearTimeout(id);
  }, [text, listening]);

  const hasWords = metrics.n > 0;
  const hindi = Math.round(metrics.hindiShare * 100);
  const shownHindi = useCount(hasWords ? hindi : 0);
  const shownEnglish = useCount(hasWords ? 100 - hindi : 0);
  const shownSwitches = useCount(metrics.switches);

  const send = useCallback(async () => {
    const message = text.trim();
    if (!message || replies.status === "loading") return;

    setNotice(null);
    const nextHistory: Turn[] = [...history, { role: "user", text: message }];
    setHistory(nextHistory);
    setReplies({ ...IDLE, status: "loading" });

    try {
      const [typical, sangam] = await Promise.all([
        requestReply({ mode: "typical", history: nextHistory }, (partial) =>
          setReplies((r) => ({ ...r, typical: { ...r.typical, text: partial } })),
        ),
        requestReply(
          {
            mode: "sangam",
            history: nextHistory,
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
  }, [text, replies.status, history, guidance, profile]);

  const rows = [
    { key: "typical", name: "Typical agent", reply: replies.typical },
    { key: "sangam", name: "Sangam", reply: replies.sangam },
  ] as const;

  return (
    <div className="fr hero">
      <GradientField className="fr-bg" control={control} />
      {children}

      <div className="pc">
        <div className="pc-top">
          <label htmlFor="in-text" className="pc-label">
            Say it the way you say it
          </label>
          <span className="pc-live">
            <i /> {listening ? "Listening" : transcribing ? "Hearing you" : "Live"}
          </span>
        </div>

        <textarea
          id="in-text"
          className="pc-input"
          rows={2}
          maxLength={200}
          value={text}
          spellCheck={false}
          placeholder="yaar meeting kal hai but…"
          onChange={(event) => setText(event.target.value)}
        />

        <div className="pc-actions">
          <button
            type="button"
            className={listening ? "btn btn-secondary btn-icon pc-mic on" : "btn btn-secondary btn-icon pc-mic"}
            onClick={toggleMic}
            aria-pressed={listening}
            disabled={transcribing}
            aria-label={listening ? "Stop listening" : "Speak instead of typing"}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" style={stroke}>
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={send}
            disabled={!text.trim() || replies.status === "loading"}
          >
            {replies.status === "loading" ? "Thinking…" : "Get replies"}
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style={stroke}>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
          {EXAMPLES.map((example) => (
            <button key={example} type="button" className="pc-chip" onClick={() => setText(example)}>
              {example}
            </button>
          ))}
        </div>
        {notice ? (
          <p className="pc-notice" role="status">
            {notice}
          </p>
        ) : null}

        <div className="pc-ribbon">
          <Ribbon tokens={tokens} />
        </div>

        <dl className="pc-stats">
          <div>
            <dt>Hindi</dt>
            <dd className="hi">
              {shownHindi}
              <span>%</span>
            </dd>
          </div>
          <div>
            <dt>English</dt>
            <dd className="en">
              {shownEnglish}
              <span>%</span>
            </dd>
          </div>
          <div>
            <dt>Switches</dt>
            <dd>{shownSwitches}</dd>
          </div>
        </dl>

        {replies.status === "idle" ? null : (
          <div className="pc-replies" aria-live="polite">
            {replies.status === "error" ? <p className="pc-notice">{replies.error}</p> : null}
            {rows.map(({ key, name, reply }) => (
              <div key={key} className={`pc-reply ${key}`}>
                <div className="pc-rh">
                  <span>{name}</span>
                  {reply.gap === null ? null : (
                    <span className={reply.gap <= MATCHED_GAP ? "pc-gap ok" : "pc-gap off"}>gap {reply.gap}</span>
                  )}
                </div>
                <p>{reply.text || "…"}</p>
                {reply.text ? (
                  <button type="button" className="pc-play" onClick={() => play(reply.text)}>
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" style={stroke}>
                      <path d="M7 5l12 7-12 7z" />
                    </svg>
                    Play
                  </button>
                ) : null}
              </div>
            ))}
            {replies.status === "done" && guidance.usedPrior ? (
              <p className="pc-hint">
                Only {profile.tokenCount} words so far, too few to read your mix, so Sangam aims for a balanced reply.
                Send a few more sentences and it adapts.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
