import { buildProfile, tag } from "@sangam/core";
import { describe, expect, it } from "vitest";
import { earlierUserTokens, type Turn } from "./history";

const user = (text: string): Turn => ({ role: "user", text });
const assistant = (text: string): Turn => ({ role: "assistant", text });
const texts = (groups: { text: string }[][]) => groups.map((tokens) => tokens.map((t) => t.text).join(" "));

describe("earlierUserTokens", () => {
  it("returns the user's turns, oldest first, and ignores the agent's", () => {
    const history = [user("kal meeting hai"), assistant("Aapka payment due hai."), user("time nahi pata")];
    expect(texts(earlierUserTokens(history, "something new"))).toEqual(["kal meeting hai", "time nahi pata"]);
  });

  it("keeps only the most recent turns", () => {
    const history = ["one", "two", "three", "four", "five", "six"].map(user);
    expect(texts(earlierUserTokens(history, "x", 3))).toEqual(["four", "five", "six"]);
  });

  it("leaves out the sentence that is still in the box, so it is not counted twice", () => {
    const history = [user("kal meeting hai"), user("yaar time nahi pata")];
    expect(texts(earlierUserTokens(history, "yaar time nahi pata"))).toEqual(["kal meeting hai"]);
  });

  it("ignores spaces around the text in the box", () => {
    expect(earlierUserTokens([user("kal hai")], "  kal hai  ")).toEqual([]);
  });

  it("returns nothing for an empty history", () => {
    expect(earlierUserTokens([], "kal hai")).toEqual([]);
  });

  it("keeps the profile from double counting a sent sentence", () => {
    const sentence = "yaar meeting kal hai but mujhe time nahi pata";
    const history = [user(sentence)];
    const profile = buildProfile([...earlierUserTokens(history, sentence), tag(sentence)]);
    expect(profile.tokenCount).toBe(9);
  });
});
