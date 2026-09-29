import { describe, expect, it } from "vitest";
import { centsToEuroInput, euroInputToCents } from "./money";

describe("euroInputToCents", () => {
  it.each([
    ["1200,50", 120050],
    ["1.200,50", 120050],
    ["1200.50", 120050],
    ["1,200.50", 120050],
    ["230000.00", 23000000],
    ["1.200", 120000],
    ["1200", 120000],
    ["0,1", 10],
    ["", 0],
    ["abc", 0],
  ])("%s -> %i Cent", (input, cents) => {
    expect(euroInputToCents(input)).toBe(cents);
  });

  it("Round-Trip ist verlustfrei", () => {
    for (const c of [0, 1, 99, 100, 120050, 23000001, 999999999]) {
      expect(euroInputToCents(centsToEuroInput(c))).toBe(c);
    }
  });
});
