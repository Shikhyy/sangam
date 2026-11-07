import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { buildProfile, check, guide, tag } from "@sangam/core";
import { createProvider, isLeakedReasoning, LlmUnavailableError, monolingualGuidance, PERSONAS } from "@sangam/llm";

/**
 * E3, mirror fidelity: how close is an agent's mix to the user's mix?
 *
 *   pnpm eval:mirror
 *
 * Three scripted speakers each ask five neutral questions. Three agents answer every question with a real
 * (free) model: Hindi only, English only, and Sangam guidance. The score is how far each reply's Hindi share
 * is from the speaker's own. Needs OPENROUTER_API_KEY in the root .env. It makes 45 model calls.
 *
 * Free models have a small daily quota. Every reply is saved to eval/out/mirror.replies.json as it arrives, so if
 * the provider says to slow down the run stops, and running it again carries on where it left off.
 */
const SPEAKERS = [
  {
    name: "A: Hindi base, English nouns",
    earlier: [
      "mujhe kal bank jaana hai account ka kaam hai",
      "aaj office mein bahut kaam tha thak gaya hoon",
      "mera phone kharab ho gaya hai naya lena padega",
      "tum sunday ko free ho kya milte hain",
      "ghar pe sab theek hai mummy ko doctor ke paas le gaya tha",
    ],
    asks: [
      "mera payment kab tak due hai mujhe yaad nahi",
      "mujhe kal ki booking parso karni hai kya ho sakta hai",
      "mera order abhi tak nahi aaya kab tak aayega",
      "mere plan mein kya kya milta hai mujhe batao",
      "mujhe bill zyada aaya hai ye galat hai",
    ],
  },
  {
    name: "B: English base, Hindi seasoning",
    earlier: [
      "I was thinking we should move the meeting to Thursday yaar",
      "Can you send me the report by tonight please I need it for the client",
      "honestly the new design looks great but thoda slow lag raha hai",
      "let me check my calendar and tell you kal",
      "I think the budget is fine par timeline tight hai",
    ],
    asks: [
      "when is my payment due, I don't remember the date",
      "can I move my booking from tomorrow to Friday please",
      "my order hasn't arrived yet, when will it get here yaar",
      "what all is included in my plan, mujhe thoda confusion hai",
      "my bill is higher than usual and I think it's wrong",
    ],
  },
  {
    name: "C: switches mid sentence",
    earlier: [
      "kal meeting hai but mujhe agenda nahi mila yet",
      "main office aa raha hoon but traffic bahut hai",
      "order place kar diya hai tracking number kya hai",
      "payment ho gaya but receipt nahi aayi",
      "call me later yaar abhi busy hoon",
    ],
    asks: [
      "payment kab due hai mujhe date yaad nahi but reminder chahiye",
      "booking change karni hai tomorrow se Friday kar do please",
      "order abhi tak nahi aaya but tracking pe kuch nahi dikh raha",
      "mere plan me kya included hai I am not sure",
      "bill zyada aaya hai but maine kuch extra use nahi kiya",
    ],
  },
];

const CONDITIONS = ["Hindi only", "English only", "Sangam"] as const;
type Condition = (typeof CONDITIONS)[number];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function ask(provider: ReturnType<typeof createProvider>, guidance: string, text: string): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      let reply = "";
      for await (const chunk of provider.reply({
        history: [{ role: "user", text }],
        guidance,
        persona: PERSONAS.support.prompt,
      })) {
        reply += chunk;
      }
      if (reply.trim() && !isLeakedReasoning(reply)) return reply.trim();
      throw new LlmUnavailableError(reply.trim() ? "the model wrote its reasoning, not a reply" : "empty reply");
    } catch (error) {
      if (!(error instanceof LlmUnavailableError) || attempt >= 4) throw error;
      await sleep(attempt * 6000);
    }
  }
}

const CACHE = "eval/out/mirror.replies.json";
const loadCache = (): Record<string, string> => (existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {});
const saveCache = (cache: Record<string, string>) => {
  mkdirSync("eval/out", { recursive: true });
  writeFileSync(CACHE, JSON.stringify(cache, null, 2));
};

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

async function main() {
  process.loadEnvFile(".env");
  const provider = createProvider({ ...process.env, SANGAM_MODE: "live" });
  const cache = loadCache();
  console.log(
    `Mirror fidelity with provider "${provider.name}". 45 replies, ${Object.keys(cache).length} already saved.\n`,
  );

  const rows: {
    speaker: string;
    ask: string;
    condition: Condition;
    reply: string;
    deltaHindiShare: number;
    replyHindiShare: number;
    targetHindiShare: number;
    judged: boolean;
    pass: boolean;
  }[] = [];

  for (const speaker of SPEAKERS) {
    for (const text of speaker.asks) {
      const profile = buildProfile([...speaker.earlier, text].map((line) => tag(line)));
      const guidance = guide({ profile });
      const guidanceFor: Record<Condition, string> = {
        "Hindi only": monolingualGuidance("hindi"),
        "English only": monolingualGuidance("english"),
        Sangam: guidance.promptFragment,
      };

      for (const condition of CONDITIONS) {
        const key = `${speaker.name}|${text}|${condition}`;
        let reply = cache[key];
        // Anything saved earlier that is really leaked reasoning is thrown away and asked again.
        if (reply !== undefined && isLeakedReasoning(reply)) reply = undefined;
        if (reply === undefined) {
          try {
            reply = await ask(provider, guidanceFor[condition], text);
          } catch (error) {
            console.error(
              `\nStopped after ${Object.keys(cache).length} of 45 replies: ${error instanceof Error ? error.message : String(error)}`,
            );
            console.error("Free model quota is probably used up. Run it again later: saved replies are kept.");
            process.exit(2);
          }
          cache[key] = reply;
          saveCache(cache);
          await sleep(1500);
        }
        const result = check(reply, guidance.target);
        rows.push({
          speaker: speaker.name,
          ask: text,
          condition,
          reply,
          deltaHindiShare: result.deltaHindiShare,
          replyHindiShare: result.replyProfile.hindiShare,
          targetHindiShare: guidance.target.hindiShare,
          judged: result.judged,
          pass: result.pass,
        });
        process.stdout.write(".");
      }
    }
  }

  console.log("\n");
  const summary = CONDITIONS.map((condition) => {
    const own = rows.filter((row) => row.condition === condition);
    return {
      condition,
      replies: own.length,
      meanDeltaHindiShare: mean(own.map((row) => row.deltaHindiShare)),
      passRate: own.filter((row) => row.pass).length / own.length,
    };
  });
  const bySpeaker = SPEAKERS.map((speaker) => ({
    speaker: speaker.name,
    targets: [
      ...new Set(rows.filter((row) => row.speaker === speaker.name).map((row) => row.targetHindiShare.toFixed(2))),
    ],
    ...Object.fromEntries(
      CONDITIONS.map((condition) => [
        condition,
        mean(
          rows
            .filter((row) => row.speaker === speaker.name && row.condition === condition)
            .map((row) => row.deltaHindiShare),
        ),
      ]),
    ),
  }));

  console.log("condition      replies  mean gap (Hindi share)  within 15 points");
  for (const row of summary) {
    console.log(
      `${row.condition.padEnd(14)} ${String(row.replies).padEnd(8)} ${row.meanDeltaHindiShare.toFixed(3).padEnd(23)} ${(row.passRate * 100).toFixed(0)}%`,
    );
  }
  console.log("\nMean gap by speaker");
  for (const row of bySpeaker) console.log(JSON.stringify(row));

  mkdirSync("eval/out", { recursive: true });
  writeFileSync(
    "eval/out/mirror.json",
    JSON.stringify({ provider: provider.name, date: new Date().toISOString(), summary, bySpeaker, rows }, null, 2),
  );
  console.log("\nFull results, with every reply, written to eval/out/mirror.json");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
