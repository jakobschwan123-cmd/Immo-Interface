import { describe, expect, it } from "vitest";
import {
  computeEuer,
  computeEuerPerProperty,
  journalRows,
  journalTotals,
} from "./euer";
import type { Property, Transaction } from "./types";

function prop(id: string, buildingValueCents: number): Property {
  return {
    id,
    name: `Objekt ${id}`,
    legalForm: "Privat",
    rentalType: "Dauervermietung",
    purchaseDate: "2020-01-01",
    purchasePriceCents: buildingValueCents * 2,
    landValueCents: buildingValueCents,
    buildingValueCents,
    afaRatePercent: 2,
    monthlyRentCents: 0,
    monthlyCostsCents: 0,
    createdBy: "test",
  } as Property;
}

function tx(
  id: string,
  propertyId: string,
  type: Transaction["type"],
  amountCents: number,
  date: string,
  category: Transaction["category"] = type === "income" ? "Mieteinnahme" : "Instandhaltung",
): Transaction {
  return { id, propertyId, type, amountCents, date, category, createdBy: "test" };
}

const props = [prop("a", 10_000_000), prop("b", 5_000_000)];
const txs: Transaction[] = [
  tx("1", "a", "income", 120_000, "2025-03-01"),
  tx("2", "b", "income", 80_050, "2025-03-02"),
  tx("3", "a", "expense", 33_333, "2025-06-10"),
  tx("4", "b", "expense", 12_345, "2025-07-11", "Versicherung"),
  tx("5", "a", "repayment", 500_000, "2025-08-01", "Sonstiges"),
  tx("6", "a", "income", 99_999, "2024-12-31"), // anderes Jahr
];

describe("A1: Summe der Einzelobjekte = Gesamt-EÜR", () => {
  it("Einnahmen, Ausgaben (inkl. AfA) und Überschuss stimmen überein", () => {
    const total = computeEuer(props, txs, 2025);
    const per = computeEuerPerProperty(props, txs, 2025);
    const sum = (f: (e: (typeof per)[number]["euer"]) => number) =>
      per.reduce((s, x) => s + f(x.euer), 0);

    expect(sum((e) => e.incomeTotalCents)).toBe(total.incomeTotalCents);
    expect(sum((e) => e.expenseTotalCents)).toBe(total.expenseTotalCents);
    expect(sum((e) => e.surplusCents)).toBe(total.surplusCents);
  });

  it("Sondertilgung und fremde Jahre zählen nicht", () => {
    const e = computeEuer(props, txs, 2025);
    expect(e.incomeTotalCents).toBe(200_050);
    // 33.333 + 12.345 Buchungen + AfA (200.000 + 100.000)
    expect(e.expenseTotalCents).toBe(33_333 + 12_345 + 300_000);
  });
});

describe("A4: Journal", () => {
  const rows = journalRows(props, txs, 2025);

  it("ist nach Datum sortiert und enthält nur das Jahr", () => {
    expect(rows.map((r) => r.id)).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("Summen entsprechen der EÜR (ohne AfA/Sondertilgung)", () => {
    const t = journalTotals(rows);
    const e = computeEuer(props, txs, 2025);
    const afa = 300_000;
    expect(t.incomeCents).toBe(e.incomeTotalCents);
    expect(t.expenseCents).toBe(e.expenseTotalCents - afa);
    expect(t.repaymentCents).toBe(500_000);
  });

  it("filtert nach Immobilien", () => {
    expect(journalRows([props[1]], txs, 2025).map((r) => r.id)).toEqual(["2", "4"]);
  });
});
