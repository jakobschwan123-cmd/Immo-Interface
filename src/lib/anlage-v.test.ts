import { describe, expect, it } from "vitest";
import { anlageVBereich, computeAnlageV } from "./anlage-v";
import { anlageVToCsv } from "./csv";
import { computeEuer, journalRows, journalTotals } from "./euer";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type Property, type Transaction } from "./types";

const p = {
  id: "a",
  name: "Objekt A",
  legalForm: "Privat",
  rentalType: "Dauervermietung",
  purchaseDate: "2020-01-01",
  purchasePriceCents: 20_000_000,
  landValueCents: 10_000_000,
  buildingValueCents: 10_000_000,
  afaRatePercent: 2,
  monthlyRentCents: 0,
  monthlyCostsCents: 0,
  createdBy: "t",
} as Property;

let n = 0;
const tx = (type: Transaction["type"], amountCents: number, category: string): Transaction =>
  ({ id: String(++n), propertyId: "a", type, amountCents, date: "2025-05-01", category, createdBy: "t" }) as Transaction;

const txs: Transaction[] = [
  tx("income", 1_080_000, "Mieteinnahme"),
  tx("income", 180_000, "Nebenkosten-Vorauszahlung"),
  tx("expense", 50_000, "Instandhaltung"), // veraltete Kategorie
  tx("expense", 70_000, "Erhaltungsaufwand"),
  tx("expense", 30_000, "Grundsteuer"),
  tx("expense", 20_000, "Versicherung"),
  tx("expense", 300_000, "Finanzierungszins"),
  tx("expense", 9_999, "Gibt es nicht"), // unbekannte Kategorie
  tx("repayment", 1_000_000, "Sonstiges"), // Sondertilgung
];

describe("A5: alte und unbekannte Kategorien fallen nicht aus der EÜR", () => {
  it("Instandhaltung zählt als Erhaltungsaufwand, Unbekanntes bleibt enthalten", () => {
    const e = computeEuer([p], txs, 2025);
    expect(e.expenses.find((l) => l.label === "Erhaltungsaufwand")?.amountCents).toBe(120_000);
    expect(e.expenses.find((l) => l.label === "Gibt es nicht")?.amountCents).toBe(9_999);
    // Journal = EÜR ohne AfA (frueher wichen die Summen bei Alt-Kategorien ab).
    const t = journalTotals(journalRows([p], txs, 2025));
    expect(t.expenseCents).toBe(e.expenseTotalCents - 200_000);
    expect(t.incomeCents).toBe(e.incomeTotalCents);
  });
});

describe("A6: Anlage V (Entwurf)", () => {
  const av = computeAnlageV(p, txs, 2025);
  const sum = (art: string) =>
    av.rows.filter((r) => r.art === art).reduce((s, r) => s + r.amountCents, 0);

  it("Summe der Positionen = EÜR (Einnahmen, Werbungskosten inkl. AfA)", () => {
    const e = computeEuer([p], txs, 2025);
    expect(sum("Einnahmen")).toBe(e.incomeTotalCents);
    expect(sum("Werbungskosten")).toBe(e.expenseTotalCents);
    expect(av.ueberschussCents).toBe(e.surplusCents);
  });

  it("jede EÜR-Position steht in genau einer Zeile", () => {
    const e = computeEuer([p], txs, 2025);
    const all = av.rows.flatMap((r) => r.positionen);
    expect(all.sort()).toEqual([...e.income, ...e.expenses].map((l) => l.label).sort());
  });

  it("ordnet Bereiche zu, Unbekanntes als „Nicht zugeordnet“, Sondertilgung fehlt", () => {
    const row = (b: string) => av.rows.find((r) => r.bereich === b);
    expect(row("Abschreibung für Gebäude (§ 7 Abs. 4 bis 5a EStG)")?.amountCents).toBe(200_000);
    expect(row("Nicht umgelegte Kosten")?.amountCents).toBe(50_000);
    expect(row("Schuldzinsen")?.zeile).toBe("46–48");
    expect(row("Nicht zugeordnet")).toMatchObject({ zugeordnet: false, amountCents: 9_999 });
    expect(av.rows.some((r) => r.amountCents === 1_000_000)).toBe(false);
  });

  it("alle auswählbaren Kategorien haben einen Bereich", () => {
    for (const c of INCOME_CATEGORIES) expect(anlageVBereich("income", c)).not.toBeNull();
    for (const c of EXPENSE_CATEGORIES) expect(anlageVBereich("expense", c)).not.toBeNull();
  });

  it("CSV enthält Entwurf-Hinweis, Bereiche und Summenzeilen", () => {
    const csv = anlageVToCsv(av);
    expect(csv).toMatch(/ENTWURF – vom Steuerberater zu bestätigen/);
    expect(csv).toMatch(/Werbungskosten;Schuldzinsen;46–48;3000,00;Finanzierungszins/);
    expect(csv).toMatch(/Summe der Werbungskosten;83;/);
  });

  it("Zeilen nur für 2025, Hinweis bei Ferienvermietung/Eigennutzung", () => {
    const later = computeAnlageV(p, [tx("income", 100, "Mieteinnahme")].map((t) => ({ ...t, date: "2026-01-01" })), 2026);
    expect(later.rows.every((r) => r.zeile === undefined)).toBe(true);
    expect(computeAnlageV({ ...p, rentalType: "Ferienvermietung" }, [], 2025).hinweise[0]).toMatch(/Steuerberater klären/);
    expect(computeAnlageV({ ...p, rentalType: "Eigennutzung" }, [], 2025).hinweise[0]).toMatch(/Steuerberater klären/);
  });
  it("GmbH: Hinweis, dass keine Anlage V gilt", () => {
    expect(computeAnlageV({ ...p, legalForm: "GmbH" }, [], 2025).hinweise[0]).toMatch(/Keine Anlage V/);
  });
});
