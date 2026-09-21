// Einnahmen-Überschuss-Rechnung (EÜR) pro Rechtsträger und Jahr.
//
// Grundidee: tatsaechliche Buchungen eines Jahres nach Kategorie gruppieren,
// zusaetzlich die Abschreibung (AfA) als Ausgabe ansetzen (sie mindert
// steuerlich den Gewinn, ist aber keine Zahlung).
//
// Hinweis: vereinfachte Darstellung als Vorbereitung fuer den Steuerberater,
// KEIN Steuerberater-Ersatz. Die AfA wird als voller Jahresbetrag angesetzt.

import { calculateKpis } from "./finance";
import { TRANSACTION_CATEGORIES } from "./types";
import type { Property, Transaction } from "./types";

export type EuerLine = { label: string; amountCents: number };

export type Euer = {
  year: number;
  income: EuerLine[]; // Einnahmen je Kategorie (nur > 0)
  incomeTotalCents: number;
  expenses: EuerLine[]; // Ausgaben je Kategorie + AfA (nur > 0)
  expenseTotalCents: number;
  surplusCents: number; // Ueberschuss (+) oder Verlust (-)
};

// Gehoert eine Buchung (per Datum) ins angegebene Jahr?
function inYear(t: Transaction, year: number): boolean {
  return t.date.startsWith(String(year));
}

// EÜR fuer eine Menge von Immobilien (z.B. eines Rechtsträgers) im Jahr `year`.
export function computeEuer(
  properties: Property[],
  transactions: Transaction[],
  year: number,
): Euer {
  const propertyIds = new Set(properties.map((p) => p.id));
  const yearTx = transactions.filter(
    (t) => propertyIds.has(t.propertyId) && inYear(t, year),
  );

  // Einnahmen je Kategorie.
  const income: EuerLine[] = [];
  let incomeTotalCents = 0;
  for (const cat of TRANSACTION_CATEGORIES) {
    const sum = yearTx
      .filter((t) => t.type === "income" && t.category === cat)
      .reduce((s, t) => s + t.amountCents, 0);
    if (sum > 0) {
      income.push({ label: cat, amountCents: sum });
      incomeTotalCents += sum;
    }
  }

  // Ausgaben je Kategorie.
  const expenses: EuerLine[] = [];
  let expenseTotalCents = 0;
  for (const cat of TRANSACTION_CATEGORIES) {
    const sum = yearTx
      .filter((t) => t.type === "expense" && t.category === cat)
      .reduce((s, t) => s + t.amountCents, 0);
    if (sum > 0) {
      expenses.push({ label: cat, amountCents: sum });
      expenseTotalCents += sum;
    }
  }

  // AfA als zusaetzliche Ausgabe (Summe ueber alle Immobilien).
  const afaCents = properties.reduce(
    (s, p) => s + calculateKpis(p).annualAfaCents,
    0,
  );
  if (afaCents > 0) {
    expenses.push({ label: "Abschreibung (AfA)", amountCents: afaCents });
    expenseTotalCents += afaCents;
  }

  return {
    year,
    income,
    incomeTotalCents,
    expenses,
    expenseTotalCents,
    surplusCents: incomeTotalCents - expenseTotalCents,
  };
}

// Alle Jahre, in denen es Buchungen gibt (fuer die Jahresauswahl),
// plus das aktuelle Jahr. Absteigend sortiert.
export function availableYears(transactions: Transaction[]): number[] {
  const years = new Set<number>();
  years.add(new Date().getFullYear());
  for (const t of transactions) {
    const y = Number(t.date.slice(0, 4));
    if (Number.isFinite(y) && y > 1990) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}
