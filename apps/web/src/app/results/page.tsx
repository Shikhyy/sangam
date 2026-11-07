import { PUBLISHED } from "@sangam/eval/published";
import type { Metadata } from "next";
import { Footer } from "../../components/Footer";
import { Nav } from "../../components/Nav";
import "../landing.css";
import "../pages.css";

export const metadata: Metadata = {
  title: "Results · Sangam",
  description: "What Sangam has measured so far, with sample sizes, failures and what is still missing.",
};

const pct = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`;
const seconds = (ms: number) => `${(ms / 1000).toFixed(2)} s`;

const SECTIONS = [
  { id: "tagger", label: "Tagging" },
  { id: "speech", label: "Speech" },
  { id: "mirror", label: "Mirror" },
  { id: "missing", label: "Not done yet" },
];

export default function ResultsPage() {
  const { tagger, speech } = PUBLISHED;
  const held = tagger.heldout;
  const lanes = ["HI", "EN", "X"] as const;

  return (
    <main className="vs">
      <Nav current="results" />

      <div className="dc-head">
        <p className="dc-kick">Evaluation</p>
        <h1>
          Measured, <em>not claimed</em>
        </h1>
        <p>
          Every number here comes from a script in the repository, with its sample size beside it. Where something is
          weak or has not been measured, this page says so.
        </p>
      </div>

      <div className="dc-layout">
        <nav className="dc-toc" aria-label="On this page">
          {SECTIONS.map((section) => (
            <a key={section.id} href={`#${section.id}`}>
              {section.label}
            </a>
          ))}
        </nav>

        <div className="dc-body">
          <section id="tagger">
            <h2>Tagging</h2>
            <p>
              Can Sangam tell Hindi words from English ones? It was scored word by word on {held.utterances} sentences
              written after the Hindi word list was last extended, so the list was never tuned on them.
            </p>
            <table className="dc-table">
              <tbody>
                <tr>
                  <td>Set</td>
                  <td>Sentences</td>
                  <td>Words</td>
                  <td>Accuracy</td>
                </tr>
                <tr>
                  <td>Held-out (the number to trust)</td>
                  <td>{held.utterances}</td>
                  <td>{held.tokens}</td>
                  <td>
                    <strong>{pct(held.accuracy)}</strong>
                  </td>
                </tr>
                <tr>
                  <td>Development (used to extend the word list)</td>
                  <td>{tagger.development.utterances}</td>
                  <td>{tagger.development.tokens}</td>
                  <td>{pct(tagger.development.accuracy)}, tuned, so not evidence</td>
                </tr>
              </tbody>
            </table>
            <p>What each part of the tagger adds, on the held-out set:</p>
            <table className="dc-table">
              <tbody>
                <tr>
                  <td>Configuration</td>
                  <td>Accuracy</td>
                </tr>
                {held.ablation.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{pct(row.accuracy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>Where it goes wrong (rows are the true language, columns are what the tagger said):</p>
            <table className="dc-table">
              <tbody>
                <tr>
                  <td />
                  <td>Said Hindi</td>
                  <td>Said English</td>
                  <td>Said neutral</td>
                </tr>
                {lanes.map((gold) => (
                  <tr key={gold}>
                    <td>{gold === "HI" ? "Hindi" : gold === "EN" ? "English" : "Neutral"}</td>
                    {lanes.map((said) => (
                      <td key={said}>{held.confusion[gold][said]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              Every one of the {held.confusion.HI.EN} mistakes is a Hindi word the hand-written word list does not know
              (for example "aayegi" or "likhiye"), which the tagger calls English. It never called an English word
              Hindi. The fix is a bigger list or a model fallback.
            </p>
            <p>
              <strong>Caveat.</strong> The sentences were written and labelled by an AI, not recorded from people, and
              no second person has labelled them. Real speech is messier, so expect a lower number in the wild.
            </p>
          </section>

          <section id="speech">
            <h2>Speech</h2>
            <p>
              Ten mixed Hindi and English sentences were spoken by Gnani Timbre, then heard again by Gnani Prisma.
              Measured on {speech.measuredOn}, one request at a time, from a laptop, so a server will differ.
            </p>
            <table className="dc-table">
              <tbody>
                <tr>
                  <td>Step</td>
                  <td>Median</td>
                  <td>Slowest of {speech.clips}</td>
                </tr>
                <tr>
                  <td>Timbre: text to audio ready</td>
                  <td>{seconds(speech.textToAudioMedianMs)}</td>
                  <td>{seconds(speech.textToAudioSlowestMs)}</td>
                </tr>
                <tr>
                  <td>Prisma: audio to text</td>
                  <td>{seconds(speech.audioToTextMedianMs)}</td>
                  <td>{seconds(speech.audioToTextSlowestMs)}</td>
                </tr>
              </tbody>
            </table>
            <p>
              The Hindi share of a sentence survived the round trip to within {pct(speech.hindiShareOffMean)} on
              average, and {pct(speech.hindiShareOffWorst)} at worst. Prisma wrote Hindi in Devanagari and English in
              Latin script in all {speech.devanagariTranscripts} transcripts, and Sangam reads both.
            </p>
            <p>
              <strong>Caveat.</strong> Ten clips, all synthetic speech from Timbre. This says nothing about real voices,
              noise or accents, and the audio is returned whole, so this is not a time to first sound.
            </p>
          </section>

          <section id="mirror">
            <h2>Mirror</h2>
            <p>
              The key question: do Sangam's replies sit closer to the speaker's own mix than an agent that always
              answers in Hindi, or always in English? The experiment is built and runs against the real free language
              models, but it has not finished: the free quota ran out partway. So there is no number here yet, and none
              is claimed.
            </p>
          </section>

          <section id="missing">
            <h2>Not done yet</h2>
            <ul className="dc-list">
              <li>The mirror experiment, to completion.</li>
              <li>A second human labelling a sample, for an agreement score.</li>
              <li>Real recorded speech, in noise, in several accents.</li>
              <li>People rating whether the replies feel more natural.</li>
              <li>The microphone on a range of real phones.</li>
            </ul>
            <p>
              The full write-up, with the commands to reproduce each number, is in the repository at{" "}
              <code>docs/RESULTS.md</code>.
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </main>
  );
}
