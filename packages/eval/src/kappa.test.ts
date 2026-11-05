import type { Lang } from "@sangam/core";
import { describe, expect, it } from "vitest";
import { type EvalItem, parseItem } from "./data";
import { cohensKappa, compareAnnotations } from "./kappa";

const item = (id: string, text: string, labels: string): EvalItem => parseItem(JSON.stringify({ id, text, labels }));

describe("cohensKappa", () => {
  it("is 1 for identical labels", () => {
    expect(cohensKappa(["HI", "EN", "X"], ["HI", "EN", "X"])).toMatchObject({ kappa: 1, agreement: 1, n: 3 });
  });

  it("matches a worked example", () => {
    // observed 3/4; expected (2/4)(1/4) + (2/4)(3/4) = 0.5; kappa = (0.75 - 0.5) / 0.5
    const a: Lang[] = ["HI", "HI", "EN", "EN"];
    const b: Lang[] = ["HI", "EN", "EN", "EN"];
    const result = cohensKappa(a, b);
    expect(result.agreement).toBeCloseTo(0.75);
    expect(result.kappa).toBeCloseTo(0.5);
  });

  it("is negative when annotators agree less than chance", () => {
    expect(cohensKappa(["HI", "EN", "HI", "EN"], ["EN", "HI", "EN", "HI"]).kappa).toBeLessThan(0);
  });

  it("is 1 when both used a single label throughout", () => {
    expect(cohensKappa(["HI", "HI"], ["HI", "HI"]).kappa).toBe(1);
  });

  it("returns zeros for no labels and throws on a length mismatch", () => {
    expect(cohensKappa([], [])).toEqual({ kappa: 0, agreement: 0, n: 0 });
    expect(() => cohensKappa(["HI"], [])).toThrow("differ in length");
  });
});

describe("compareAnnotations", () => {
  it("matches utterances by id and compares every token", () => {
    const a = [item("u1", "kal meeting hai", "HI EN HI"), item("u2", "ok thanks", "X EN")];
    const b = [item("u2", "ok thanks", "X EN"), item("u1", "kal meeting hai", "HI EN EN")];
    const report = compareAnnotations(a, b);
    expect(report.items).toBe(2);
    expect(report.n).toBe(5);
    expect(report.agreement).toBeCloseTo(4 / 5);
  });

  it("reports utterances only one annotator labelled", () => {
    const a = [item("u1", "kal hai", "HI HI"), item("u3", "ok", "X")];
    const b = [item("u1", "kal hai", "HI HI"), item("u2", "yaar", "HI")];
    const report = compareAnnotations(a, b);
    expect(report.onlyInA).toEqual(["u3"]);
    expect(report.onlyInB).toEqual(["u2"]);
    expect(report.items).toBe(1);
  });

  it("throws when the same id has different text", () => {
    const a = [item("u1", "kal hai", "HI HI")];
    const b = [item("u1", "kal nahi", "HI HI")];
    expect(() => compareAnnotations(a, b)).toThrow("u1: the text differs");
  });
});
