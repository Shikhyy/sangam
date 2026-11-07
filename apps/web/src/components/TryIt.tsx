"use client";

import { useState } from "react";

const START = "yaar meeting kal hai but mujhe time nahi pata";

/** A box on the docs page that calls the real /api/v1/profile endpoint and shows the answer. */
export function TryIt() {
  const [text, setText] = useState(START);
  const [state, setState] = useState<{ status: "idle" | "loading" | "done" | "error"; output: string }>({
    status: "idle",
    output: "",
  });

  const run = async () => {
    setState({ status: "loading", output: "" });
    try {
      const response = await fetch("/api/v1/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ utterances: [text] }),
      });
      const data = (await response.json()) as { profile?: unknown; error?: { message?: string } };
      if (!response.ok) {
        setState({ status: "error", output: data.error?.message ?? "The request failed." });
        return;
      }
      setState({ status: "done", output: JSON.stringify(data.profile, null, 2) });
    } catch {
      setState({ status: "error", output: "Couldn't reach the API. Check your connection." });
    }
  };

  return (
    <div className="dc-try">
      <label htmlFor="try-text" className="dc-try-label">
        Say something in Hinglish
      </label>
      <textarea
        id="try-text"
        className="dc-try-input"
        rows={2}
        maxLength={500}
        value={text}
        spellCheck={false}
        onChange={(event) => setText(event.target.value)}
      />
      <button
        type="button"
        className="btn btn-primary"
        onClick={run}
        disabled={!text.trim() || state.status === "loading"}
      >
        {state.status === "loading" ? "Running…" : "POST /api/v1/profile"}
      </button>
      <pre className={state.status === "error" ? "dc-code dc-error" : "dc-code"} aria-live="polite">
        <code>{state.output || "The profile appears here."}</code>
      </pre>
    </div>
  );
}
