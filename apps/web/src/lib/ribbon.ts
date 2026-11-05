import type { Lang, TaggedToken } from "@sangam/core";

export interface RibbonBlock {
  text: string;
  lang: Lang;
  /** The lane the block sits in. Neutral words stay in the lane of the word before them. */
  lane: "HI" | "EN";
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RibbonLayout {
  width: number;
  height: number;
  blocks: RibbonBlock[];
  /** SVG path data joining each block to the next. */
  links: string[];
}

export const BLOCK_HEIGHT = 32;
const GAP = 14;
const CHAR_WIDTH = 8.6;
const PADDING = 18;
const MIN_WIDTH = 36;
const LANE_Y = { HI: 0, EN: 54 } as const;

/**
 * Lay out the two-lane ribbon: Hindi words in the upper lane, English words in the lower,
 * in the order they were said, with a link between each word and the next.
 */
export function layoutRibbon(tokens: readonly TaggedToken[]): RibbonLayout {
  const blocks: RibbonBlock[] = [];
  let x = 0;
  let lane: "HI" | "EN" = "HI";

  for (const token of tokens) {
    if (token.lang !== "X") lane = token.lang;
    const width = Math.max(MIN_WIDTH, Math.round(PADDING + token.text.length * CHAR_WIDTH));
    blocks.push({ text: token.text, lang: token.lang, lane, x, y: LANE_Y[lane], width, height: BLOCK_HEIGHT });
    x += width + GAP;
  }

  const links: string[] = [];
  for (let i = 1; i < blocks.length; i++) {
    const from = blocks[i - 1];
    const to = blocks[i];
    if (!from || !to) continue;
    const x1 = from.x + from.width;
    const y1 = from.y + BLOCK_HEIGHT / 2;
    const x2 = to.x;
    const y2 = to.y + BLOCK_HEIGHT / 2;
    links.push(
      y1 === y2 ? `M${x1} ${y1}H${x2}` : `M${x1} ${y1}C${x1 + GAP / 2} ${y1} ${x2 - GAP / 2} ${y2} ${x2} ${y2}`,
    );
  }

  const last = blocks.at(-1);
  return { width: last ? last.x + last.width : 0, height: LANE_Y.EN + BLOCK_HEIGHT, blocks, links };
}
