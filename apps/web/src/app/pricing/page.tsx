import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "../../components/Footer";
import { Nav } from "../../components/Nav";
import "../landing.css";
import "../pages.css";

export const metadata: Metadata = {
  title: "Pricing · Sangam",
  description: "Sangam is free to try. Paid plans for teams that ship voice agents are planned.",
};

const TIERS = [
  {
    name: "Try",
    status: "Available now",
    blurb: "For looking around and for demos.",
    items: [
      "The playground, with speech in and out",
      "The public API on the demo host, open and rate limited",
      "Hindi and English",
    ],
    cta: { label: "Open the playground", href: "/playground" },
    featured: false,
  },
  {
    name: "Build",
    status: "Planned",
    blurb: "For a developer putting Sangam in one agent.",
    items: [
      "Your own API keys and higher limits",
      "A usage dashboard",
      "Saved agents with your own persona and tone",
      "Email support",
    ],
    cta: { label: "Tell us what you need", href: "https://github.com/Shikhyy/sangam/issues/new" },
    featured: true,
  },
  {
    name: "Scale",
    status: "Planned",
    blurb: "For a team running voice agents for real customers.",
    items: [
      "Everything in Build",
      "More languages mixed with English",
      "A streaming voice session that does the whole loop",
      "Agreed limits and a response time you can rely on",
    ],
    cta: { label: "Tell us what you need", href: "https://github.com/Shikhyy/sangam/issues/new" },
    featured: false,
  },
];

export default function PricingPage() {
  return (
    <main className="vs">
      <Nav current="pricing" />

      <div className="dc-head" style={{ textAlign: "center" }}>
        <p className="dc-kick">Pricing</p>
        <h1>
          Free to try. <em>Plans are coming.</em>
        </h1>
        <p style={{ margin: "0 auto" }}>
          Sangam is a project in progress. Today everything is free. The plans below are what we intend to build, and
          prices are not set yet, so none are shown.
        </p>
      </div>

      <div className="pr-grid">
        {TIERS.map((tier) => (
          <article key={tier.name} className={tier.featured ? "pr-card featured" : "pr-card"}>
            <div className="pr-top">
              <h2>{tier.name}</h2>
              <span className={tier.status === "Planned" ? "pr-tag" : "pr-tag live"}>{tier.status}</span>
            </div>
            <p className="pr-blurb">{tier.blurb}</p>
            <p className="pr-price">[ price ]</p>
            <ul>
              {tier.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {tier.cta.href.startsWith("/") ? (
              <Link href={tier.cta.href} className="btn btn-primary">
                {tier.cta.label}
              </Link>
            ) : (
              <a href={tier.cta.href} className="btn btn-secondary">
                {tier.cta.label}
              </a>
            )}
          </article>
        ))}
      </div>

      <p className="pr-note">
        Want something in a plan, or a language we don't cover yet? Open an issue and say what you need. That is how the
        plans get decided.
      </p>

      <Footer />
    </main>
  );
}
