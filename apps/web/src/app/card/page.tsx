import type { Metadata } from "next";
import Link from "next/link";
import { CardArt } from "../../components/CardArt";
import { CardMaker } from "../../components/CardMaker";
import { Footer } from "../../components/Footer";
import { Nav } from "../../components/Nav";
import { cardOf, cleanCardText } from "../../lib/card";
import "../landing.css";
import "../pages.css";

type Search = Promise<{ t?: string | string[] }>;

const textFrom = async (searchParams: Search) => {
  const { t } = await searchParams;
  return cleanCardText(Array.isArray(t) ? t[0] : t);
};

export async function generateMetadata({ searchParams }: { searchParams: Search }): Promise<Metadata> {
  const text = await textFrom(searchParams);
  const card = cardOf(text);
  const title = card.hasWords
    ? `I mix ${card.hindiPercent}% Hindi and ${card.englishPercent}% English`
    : "What's your Hinglish?";
  const description = card.hasWords
    ? `${card.style}. Find out how you mix Hindi and English.`
    : "Type a sentence and see how you mix Hindi and English.";
  const image = `/card/og?t=${encodeURIComponent(text)}`;
  return {
    title: `${title} · Sangam`,
    description,
    openGraph: { title, description, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function CardPage({ searchParams }: { searchParams: Search }) {
  const text = await textFrom(searchParams);
  const card = cardOf(text);

  return (
    <main className="vs">
      <Nav current="card" />

      <div className="dc-head" style={{ textAlign: "center" }}>
        <p className="dc-kick">Share your mix</p>
        <h1>
          What's your <em>Hinglish?</em>
        </h1>
        <p style={{ margin: "0 auto" }}>
          Type a sentence the way you say it. Sangam reads each word as Hindi or English and gives you a card to share.
        </p>
      </div>

      <div className="vs-wrap">
        <div className="fr ct-frame">
          <CardArt
            hindiShare={card.hasWords ? card.hindiPercent / 100 : 0.5}
            switchRate={card.hasWords ? card.switchPercent / 100 : 0.3}
          />

          <div className="ct-card" aria-live="polite">
            {card.hasWords ? (
              <>
                <p className="ct-style">{card.style}</p>
                <p className="ct-big">
                  <span className="hi">{card.hindiPercent}%</span> Hindi
                </p>
                <div
                  className="ct-bar"
                  role="img"
                  aria-label={`${card.hindiPercent} percent Hindi, ${card.englishPercent} percent English`}
                >
                  <i className="h" style={{ flexGrow: card.hindiPercent }} />
                  <i className="e" style={{ flexGrow: card.englishPercent }} />
                </div>
                <div className="ct-legend">
                  <span>
                    <b className="hi">{card.hindiPercent}%</b> Hindi
                  </span>
                  <span>
                    <b className="en">{card.englishPercent}%</b> English
                  </span>
                </div>
                <dl className="ct-stats">
                  <div>
                    <dt>Mixing index</dt>
                    <dd>{card.mixIndex}</dd>
                  </div>
                  <div>
                    <dt>Switches</dt>
                    <dd>{card.switchPercent}%</dd>
                  </div>
                  <div>
                    <dt>Words read</dt>
                    <dd>{card.words}</dd>
                  </div>
                </dl>
                <p className="ct-brand">sangam · a voice agent that talks like you</p>
              </>
            ) : (
              <p className="ct-empty">Your card appears here.</p>
            )}
          </div>
        </div>

        <div className="ct-below">
          <CardMaker initial={text} hasCard={card.hasWords} />
          <p className="ct-cta">
            Want an agent that answers in your mix? <Link href="/playground">Try the playground</Link>
          </p>
        </div>
      </div>

      <Footer />
    </main>
  );
}
