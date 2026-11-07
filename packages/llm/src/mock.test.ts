import { mixMetrics, tag } from "@sangam/core";
import { describe, expect, it } from "vitest";
import { DEFAULT_MOCK_SCRIPTS, MockProvider } from "./mock";
import type { ChatTurn } from "./types";

const history: ChatTurn[] = [{ role: "user", text: "payment kab hai?" }];

async function collect(iterable: AsyncIterable<string>): Promise<string[]> {
  const chunks: string[] = [];
  for await (const chunk of iterable) chunks.push(chunk);
  return chunks;
}

const textFor = async (targetHindiShare?: number) =>
  (await collect(new MockProvider().reply({ history, targetHindiShare }))).join("");

describe("MockProvider", () => {
  it("has the name mock", () => {
    expect(new MockProvider().name).toBe("mock");
  });

  it("picks the script for the target Hindi share", async () => {
    expect(await textFor(0)).toBe(DEFAULT_MOCK_SCRIPTS[0]?.text);
    expect(await textFor(0.1)).toBe(DEFAULT_MOCK_SCRIPTS[1]?.text);
    expect(await textFor(0.5)).toBe(DEFAULT_MOCK_SCRIPTS[2]?.text);
    expect(await textFor(0.9)).toBe(DEFAULT_MOCK_SCRIPTS[3]?.text);
  });

  it("uses the middle script when no target is given", async () => {
    expect(await textFor(undefined)).toBe(DEFAULT_MOCK_SCRIPTS[2]?.text);
  });

  it("includes the boundary in the lower script", async () => {
    expect(await textFor(0.05)).toBe(DEFAULT_MOCK_SCRIPTS[0]?.text);
    expect(await textFor(0.3)).toBe(DEFAULT_MOCK_SCRIPTS[1]?.text);
    expect(await textFor(0.7)).toBe(DEFAULT_MOCK_SCRIPTS[2]?.text);
  });

  it("streams word by word", async () => {
    const chunks = await collect(new MockProvider().reply({ history, targetHindiShare: 0.5 }));
    expect(chunks.length).toBeGreaterThan(3);
    expect(chunks.join("")).toBe(DEFAULT_MOCK_SCRIPTS[2]?.text);
    expect(chunks.at(-1)?.endsWith(" ")).toBe(false);
  });

  it("stops when aborted", async () => {
    const controller = new AbortController();
    const chunks: string[] = [];
    for await (const chunk of new MockProvider().reply({ history, signal: controller.signal })) {
      chunks.push(chunk);
      controller.abort();
    }
    expect(chunks).toHaveLength(1);
  });

  it("uses custom scripts", async () => {
    const provider = new MockProvider({ scripts: [{ maxHindiShare: 1, text: "Namaste ji" }] });
    expect((await collect(provider.reply({ history }))).join("")).toBe("Namaste ji");
  });

  it("yields nothing when there are no scripts", async () => {
    expect(await collect(new MockProvider({ scripts: [] }).reply({ history }))).toEqual([]);
  });
});

describe("DEFAULT_MOCK_SCRIPTS", () => {
  it("really have the Hindi share they are filed under", () => {
    let previousMax = -1;
    for (const script of DEFAULT_MOCK_SCRIPTS) {
      const { hindiShare } = mixMetrics(tag(script.text));
      expect(hindiShare).toBeLessThanOrEqual(script.maxHindiShare);
      expect(hindiShare).toBeGreaterThan(previousMax);
      previousMax = script.maxHindiShare;
    }
  });
});
