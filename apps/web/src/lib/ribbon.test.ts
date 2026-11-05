import { tag } from "@sangam/core";
import { describe, expect, it } from "vitest";
import { BLOCK_HEIGHT, layoutRibbon } from "./ribbon";

describe("layoutRibbon", () => {
  it("puts Hindi words in the upper lane and English words in the lower lane", () => {
    const { blocks } = layoutRibbon(tag("yaar meeting kal"));
    expect(blocks.map((b) => [b.text, b.lane, b.y])).toEqual([
      ["yaar", "HI", 0],
      ["meeting", "EN", 54],
      ["kal", "HI", 0],
    ]);
  });

  it("places words left to right with a gap, and reports the total width", () => {
    const layout = layoutRibbon(tag("yaar meeting kal"));
    expect(layout.blocks.map((b) => [b.x, b.width])).toEqual([
      [0, 52],
      [66, 78],
      [158, 44],
    ]);
    expect(layout.width).toBe(202);
    expect(layout.height).toBe(54 + BLOCK_HEIGHT);
  });

  it("links each word to the next, with a curve when the lane changes", () => {
    const { links } = layoutRibbon(tag("yaar meeting kal"));
    expect(links).toEqual(["M52 16C59 16 59 70 66 70", "M144 70C151 70 151 16 158 16"]);
  });

  it("uses a straight link inside one lane", () => {
    expect(layoutRibbon(tag("kal hai")).links).toEqual(["M44 16H58"]);
  });

  it("keeps a neutral word in the lane of the word before it", () => {
    const { blocks } = layoutRibbon(tag("meeting Rahul"));
    expect(blocks.map((b) => [b.text, b.lang, b.lane])).toEqual([
      ["meeting", "EN", "EN"],
      ["Rahul", "X", "EN"],
    ]);
  });

  it("starts a leading neutral word in the upper lane", () => {
    expect(layoutRibbon(tag("5000 rupaye")).blocks[0]?.lane).toBe("HI");
  });

  it("gives every block at least the minimum width", () => {
    expect(layoutRibbon(tag("a")).blocks[0]?.width).toBe(36);
  });

  it("returns an empty layout for no words", () => {
    expect(layoutRibbon([])).toEqual({ width: 0, height: 86, blocks: [], links: [] });
  });
});
