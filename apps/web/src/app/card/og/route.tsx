import { ImageResponse } from "next/og";
import { cardOf } from "../../../lib/card";

export const runtime = "nodejs";

const PAPER = "#f2efe4";
const INK = "#26231e";
const WARM = "#ff8a1f";
const COOL = "#3d2f7a";

/**
 * The image shown when a card link is shared. It uses numbers and the style name only, never the
 * sentence, and only plain Latin text, which the built-in font can draw.
 */
export async function GET(request: Request): Promise<Response> {
  const card = cardOf(new URL(request.url).searchParams.get("t"));

  const headline = card.hasWords ? `${card.hindiPercent}% Hindi` : "What's your Hinglish?";
  const sub = card.hasWords ? (card.style ?? "") : "Type a sentence and find out how you mix Hindi and English.";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: PAPER,
        color: INK,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", fontSize: 38, fontWeight: 600 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "#5b5d43",
            marginRight: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 30,
          }}
        >
          S
        </div>
        Sangam
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 132, fontWeight: 700, letterSpacing: -4, lineHeight: 1 }}>
          {headline}
        </div>
        <div style={{ display: "flex", fontSize: 44, marginTop: 20, color: "#524e45" }}>{sub}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", height: 34, borderRadius: 17, overflow: "hidden", background: "#ddd8c6" }}>
          <div style={{ display: "flex", flexGrow: card.hasWords ? card.hindiPercent : 50, background: WARM }} />
          <div style={{ display: "flex", flexGrow: card.hasWords ? card.englishPercent : 50, background: COOL }} />
        </div>
        <div
          style={{ display: "flex", justifyContent: "space-between", marginTop: 22, fontSize: 30, color: "#524e45" }}
        >
          <div style={{ display: "flex" }}>
            {card.hasWords ? `${card.hindiPercent}% Hindi, ${card.englishPercent}% English` : "Hindi and English"}
          </div>
          <div style={{ display: "flex" }}>a voice agent that talks like you</div>
        </div>
      </div>
    </div>,
    { width: 1200, height: 630, headers: { "cache-control": "public, max-age=3600" } },
  );
}
