import Link from "next/link";
import { Logo } from "./Logo";
import { PaintedLandscape } from "./PaintedLandscape";

const REPO = "https://github.com/Shikhyy/sangam";

const PRODUCT = [
  { label: "How it works", href: "/#how" },
  { label: "Playground", href: "/playground" },
  { label: "Docs", href: "/docs" },
  { label: "Share your mix", href: "/card" },
];

const RESOURCES = [
  { label: "Source code", href: REPO },
  { label: "Documentation", href: `${REPO}/tree/main/docs` },
  { label: "Evaluation plan", href: `${REPO}/blob/main/docs/EVAL.md` },
];

const BUILT_WITH = [
  { name: "Gnani Prisma", note: "speech recognition" },
  { name: "Gnani Timbre", note: "speech output" },
  { name: "Claude", note: "reply writing" },
];

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** The site footer: brand and links on paper, then a painted countryside that fades up from the bottom. */
export function Footer() {
  return (
    <footer className="ft">
      <div className="ft-wrap ft-top">
        <div className="ft-brand">
          <Link href="/" className="ft-logo">
            <Logo />
          </Link>
          <p>Know how you really talk. A voice agent that replies in the same Hindi and English mix.</p>
          <a href={REPO} className="ft-social">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style={stroke}>
              <path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" />
            </svg>
            <span className="sr-only">Source code on GitHub</span>
          </a>
          <p className="ft-note">Built for the Great Indian AI Internship Challenge.</p>
        </div>

        <nav className="ft-col" aria-label="Product">
          <h2>Product</h2>
          {PRODUCT.map((link) => (
            <Link key={link.label} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        <nav className="ft-col" aria-label="Resources">
          <h2>Resources</h2>
          {RESOURCES.map((link) => (
            <a key={link.label} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ft-col">
          <h2>Built with</h2>
          {BUILT_WITH.map((item) => (
            <p key={item.name}>
              {item.name} <span>{item.note}</span>
            </p>
          ))}
        </div>
      </div>

      <div className="ft-wrap ft-bar">
        <p>© 2026 Sangam. Audio is processed to make your profile and isn't stored.</p>
        <div>
          <a href={REPO}>Source</a>
          <Link href="/playground" className="ft-cta">
            Try the playground
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" style={stroke}>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="ft-paint">
        <PaintedLandscape className="ft-canvas" />
      </div>
    </footer>
  );
}
