"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CARD_MAX_CHARS } from "../lib/card";

/** Type a sentence, get a card with a link to share it. */
export function CardMaker({ initial, hasCard }: { initial: string; hasCard: boolean }) {
  const router = useRouter();
  const [text, setText] = useState(initial);
  const [copied, setCopied] = useState(false);

  const query = `t=${encodeURIComponent(text.trim())}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/card?${query}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the address bar already holds the link.
    }
  };

  return (
    <form
      className="ct-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (text.trim()) router.push(`/card?${query}`);
      }}
    >
      <label htmlFor="card-text" className="ct-label">
        Say something the way you say it
      </label>
      <textarea
        id="card-text"
        className="ct-input"
        rows={2}
        maxLength={CARD_MAX_CHARS}
        value={text}
        spellCheck={false}
        placeholder="yaar meeting kal hai but mujhe time nahi pata"
        onChange={(event) => setText(event.target.value)}
      />
      <div className="ct-actions">
        <button type="submit" className="btn btn-primary" disabled={!text.trim()}>
          Make my card
        </button>
        {hasCard ? (
          <>
            <button type="button" className="btn btn-secondary" onClick={copy}>
              {copied ? "Link copied" : "Copy link"}
            </button>
            <a className="btn btn-secondary" href={`/card/og?${query}`} download="my-hinglish.png">
              Download image
            </a>
          </>
        ) : null}
      </div>
      {hasCard ? (
        <p className="ct-note">The link contains your sentence, so share it only if you are happy with that.</p>
      ) : null}
    </form>
  );
}
