import type { TaggedToken } from "@sangam/core";
import { layoutRibbon } from "../lib/ribbon";

const wordsIn = (tokens: readonly TaggedToken[], lang: "HI" | "EN") =>
  tokens
    .filter((token) => token.lang === lang)
    .map((token) => token.text)
    .join(", ");

/** The two-lane confluence ribbon: Hindi words above, English words below, joined where the speaker switches. */
export function Ribbon({ tokens }: { tokens: readonly TaggedToken[] }) {
  const layout = layoutRibbon(tokens);

  if (layout.blocks.length === 0) {
    return (
      <p className="small" style={{ minHeight: 92, display: "flex", alignItems: "center" }}>
        Your words appear here, Hindi in the upper lane and English in the lower.
      </p>
    );
  }

  const label = `Two-lane ribbon of your sentence. Hindi in the upper lane: ${wordsIn(tokens, "HI") || "none"}. English in the lower lane: ${wordsIn(tokens, "EN") || "none"}.`;

  return (
    <div className="ribbon-scroll">
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        width={layout.width}
        height={layout.height}
        role="img"
        aria-label={label}
        style={{ display: "block", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 14 }}
      >
        <g fill="none" stroke="var(--ctl)" strokeWidth={1.5}>
          {layout.links.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        {layout.blocks.map((block, index) => {
          const neutral = block.lang === "X";
          const fill = block.lang === "HI" ? "var(--hi-t)" : block.lang === "EN" ? "var(--en-t)" : "none";
          const color = block.lang === "HI" ? "var(--hi)" : block.lang === "EN" ? "var(--en)" : "var(--ink-3)";
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: blocks have no stable id and are never reordered
            <g key={`${index}-${block.text}`}>
              <rect
                x={block.x}
                y={block.y}
                width={block.width}
                height={block.height}
                rx={9}
                fill={fill}
                stroke={neutral ? "var(--ctl)" : "none"}
                strokeDasharray={neutral ? "4 3" : undefined}
              />
              <text x={block.x + block.width / 2} y={block.y + 21} textAnchor="middle" fill={color}>
                {block.text}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
