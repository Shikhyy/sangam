import { ImageResponse } from "next/og";

export const alt = "Sangam: a voice agent that talks like you";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The preview shown when the home page is shared. Plain Latin text only, which the built-in font can draw. */
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#f2efe4",
        color: "#26231e",
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
        <div style={{ display: "flex", fontSize: 112, fontWeight: 700, letterSpacing: -3, lineHeight: 1.02 }}>
          A voice agent that talks like you.
        </div>
        <div style={{ display: "flex", fontSize: 40, marginTop: 24, color: "#524e45" }}>
          It measures how you mix Hindi and English, then answers in the same mix.
        </div>
      </div>
      <div style={{ display: "flex", height: 30, borderRadius: 15, overflow: "hidden", background: "#ddd8c6" }}>
        <div style={{ display: "flex", flexGrow: 6, background: "#ff8a1f" }} />
        <div style={{ display: "flex", flexGrow: 4, background: "#3d2f7a" }} />
      </div>
    </div>,
    size,
  );
}
