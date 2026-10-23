import { describe, expect, it } from "vitest";
import {
  EMPTY_EXTRACTION,
  normalizeReceiptExtraction,
  parseAmountCents,
  parseIsoDate,
} from "./receipts";

describe("parseAmountCents", () => {
  it.each([
    ["1.234,56", 123456],
    ["1234,56 €", 123456],
    ["EUR 89,90", 8990],
    ["1,234.56", 123456],
    ["12", 1200],
    ["1 234,56 EUR", 123456],
    [49.99, 4999],
    [0.1 + 0.2, 30],
  ])("%s -> %i Cent", (input, cents) => {
    expect(parseAmountCents(input)).toBe(cents);
  });

  it.each([["abc"], [""], ["-12,50"], ["0,00"], [0], [-5], [NaN], [Infinity], [null], [{}], ["12 Euro 50"]])(
    "%s -> null",
    (input) => {
      expect(parseAmountCents(input)).toBeNull();
    },
  );
});

describe("parseIsoDate", () => {
  it.each([
    ["2026-03-15", "2026-03-15"],
    [" 2024-02-29 ", "2024-02-29"],
    ["15.03.2026", "2026-03-15"],
    ["1.3.2026", "2026-03-01"],
  ])("%s -> %s", (input, out) => {
    expect(parseIsoDate(input)).toBe(out);
  });

  it.each([["2025-02-29"], ["2026-13-01"], ["31.04.2026"], ["15/03/2026"], ["gestern"], [""], [20260315], [null], ["0000-01-01"]])(
    "%s -> null",
    (input) => {
      expect(parseIsoDate(input)).toBeNull();
    },
  );
});

describe("normalizeReceiptExtraction", () => {
  it("normalisiert eine gueltige Gemini-Antwort (JSON-String)", () => {
    const json = JSON.stringify({
      amount: "1.190,00",
      date: "2026-05-02",
      description: "  Rechnung Sanitär Müller  ",
      category: "Instandhaltung",
      confidence: 0.92,
      rawText: "Müller GmbH ...",
    });
    expect(normalizeReceiptExtraction(json)).toEqual({
      amountCents: 119000,
      date: "2026-05-02",
      description: "Rechnung Sanitär Müller",
      categorySuggestion: "Instandhaltung",
      confidence: 0.92,
      rawText: "Müller GmbH ...",
    });
  });

  it("setzt ungueltige Felder einzeln auf null", () => {
    expect(
      normalizeReceiptExtraction({ amount: "viel", date: "irgendwann", description: 42, category: "", confidence: 7 }),
    ).toEqual(EMPTY_EXTRACTION);
  });

  it.each([["kein json"], ["[1,2]"], [null], [undefined], [123], ["null"]])("Unsinn %s -> alles null", (input) => {
    expect(normalizeReceiptExtraction(input)).toEqual(EMPTY_EXTRACTION);
  });

  it("kuerzt lange Texte", () => {
    const r = normalizeReceiptExtraction({ description: "x".repeat(1000), rawText: "y".repeat(10000) });
    expect(r.description).toHaveLength(200);
    expect(r.rawText).toHaveLength(4000);
  });
});
