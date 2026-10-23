// Einnahmen-Überschuss-Rechnung (EÜR) pro Rechtsträger und Jahr.
//
// Grundidee: tatsaechliche Buchungen eines Jahres nach Kategorie gruppieren,
// zusaetzlich die Abschreibung (AfA, siehe afaForYear) als Ausgabe ansetzen (sie mindert
// steuerlich den Gewinn, ist aber keine Zahlung).
//
// Hinweis: vereinfachte Darstellung als Vorbereitung fuer den Steuerberater,
// KEIN Steuerberater-Ersatz. Die AfA wird im Kaufjahr monatsgenau (Kaufmonat voll) angesetzt.

import { afaForYear } from "./finance";
import { loanInterestForYear } from "./loan";
import { normalizeCategory, TRANSACTION_CATEGORIES } from "./types";
import type { Property, Transaction } from "./types";

export type EuerLine = { label: string; amountCents: number };

export type Euer = {
  year: number;
  income: EuerLine[]; // Einnahmen je Kategorie (nur > 0)
  incomeTotalCents: number;
  expenses: EuerLine[]; // Ausgaben je Kategorie + AfA (nur > 0)
  expenseTotalCents: number;
  surplusCents: number; // Ueberschuss (+) oder Verlust (-)
  // Plausibilitaetsvergleich Darlehenszins: berechnet (Annuitaetenplan) vs. gebucht
  // (Kategorie "Finanzierungszins"). null, wenn kein Objekt einen Kredit hat.
  // Fliesst NICHT in die EÜR-Summen ein (kein Doppelansatz).
  loanInterestCheck: {
    calculatedCents: number;
    bookedCents: number;
    diffCents: number; // berechnet - gebucht
  } | null;
};

export const AFA_LABEL = "Abschreibung (AfA)";

// Summen je Kategorie (nur > 0). Veraltete Kategorien zaehlen unter der neuen
// (normalizeCategory); unbekannte Kategorien fallen NICHT heraus, sondern
// erscheinen am Ende – so stimmen EÜR und Journal immer ueberein.
function linesByCategory(txs: Transaction[], type: "income" | "expense"): EuerLine[] {
  const sums = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== type) continue;
    const cat = normalizeCategory(t.category);
    sums.set(cat, (sums.get(cat) ?? 0) + t.amountCents);
  }
  const order = (c: string) => {
    const i = (TRANSACTION_CATEGORIES as string[]).indexOf(c);
    return i === -1 ? TRANSACTION_CATEGORIES.length : i;
  };
  return [...sums]
    .filter(([, sum]) => sum > 0)
    .sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b))
    .map(([label, amountCents]) => ({ label, amountCents }));
}

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

  // Einnahmen und Ausgaben je Kategorie.
  const income = linesByCategory(yearTx, "income");
  const expenses = linesByCategory(yearTx, "expense");
  const incomeTotalCents = income.reduce((s, l) => s + l.amountCents, 0);
  let expenseTotalCents = expenses.reduce((s, l) => s + l.amountCents, 0);

  // AfA als zusaetzliche Ausgabe (Summe ueber alle Immobilien).
  const afaCents = properties.reduce(
    (s, p) => s + afaForYear(p, year),
    0,
  );
  if (afaCents > 0) {
    expenses.push({ label: AFA_LABEL, amountCents: afaCents });
    expenseTotalCents += afaCents;
  }

  // Vergleich Darlehenszins (nur zur Anzeige, nicht in den Summen).
  let calculatedCents = 0;
  let hasLoan = false;
  const loanPropertyIds = new Set<string>();
  for (const p of properties) {
    const repayments = transactions
      .filter((t) => t.propertyId === p.id && t.type === "repayment")
      .map((t) => ({ amountCents: t.amountCents, date: t.date }));
    const ly = loanInterestForYear(p, year, repayments);
    if (ly.configured) {
      hasLoan = true;
      loanPropertyIds.add(p.id);
      calculatedCents += ly.interestCents;
    }
  }
  // Nur Objekte mit Kreditdaten vergleichen, sonst meldet die Warnung Fehlalarme.
  const bookedCents = yearTx
    .filter(
      (t) =>
        t.type === "expense" &&
        normalizeCategory(t.category) === "Finanzierungszins" &&
        loanPropertyIds.has(t.propertyId),
    )
    .reduce((s, t) => s + t.amountCents, 0);

  return {
    year,
    income,
    incomeTotalCents,
    expenses,
    expenseTotalCents,
    surplusCents: incomeTotalCents - expenseTotalCents,
    loanInterestCheck: hasLoan
      ? { calculatedCents, bookedCents, diffCents: calculatedCents - bookedCents }
      : null,
  };
}

// Objektbezogene EÜR: je Immobilie eine eigene EÜR (Liste mit einem Element
// an computeEuer). Die Summe der Einzelobjekte entspricht der Gesamt-EÜR.
export function computeEuerPerProperty(
  properties: Property[],
  transactions: Transaction[],
  year: number,
): { property: Property; euer: Euer }[] {
  return properties.map((property) => ({
    property,
    euer: computeEuer([property], transactions, year),
  }));
}

export type JournalRow = {
  id: string;
  date: string; // ISO "YYYY-MM-DD"
  propertyName: string;
  category: string;
  description: string;
  type: Transaction["type"];
  amountCents: number; // immer positiv, Vorzeichen ergibt sich aus type
};

// Buchungsjournal eines Jahres: lueckenloser Einzelnachweis, nach Datum sortiert.
// Sondertilgungen (type "repayment") sind enthalten, aber gekennzeichnet –
// sie zaehlen nicht in die EÜR (siehe journalTotals).
export function journalRows(
  properties: Property[],
  transactions: Transaction[],
  year: number,
): JournalRow[] {
  const names = new Map(properties.map((p) => [p.id, p.name]));
  return transactions
    .filter((t) => names.has(t.propertyId) && inYear(t, year))
    .map((t) => ({
      id: t.id,
      date: t.date,
      propertyName: names.get(t.propertyId) ?? "",
      category: t.category,
      description: t.description ?? "",
      type: t.type,
      amountCents: t.amountCents,
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

// Summen der Journalzeilen, die der EÜR entsprechen (ohne AfA und Sondertilgung).
export function journalTotals(rows: JournalRow[]): {
  incomeCents: number;
  expenseCents: number;
  repaymentCents: number;
} {
  let incomeCents = 0;
  let expenseCents = 0;
  let repaymentCents = 0;
  for (const r of rows) {
    if (r.type === "income") incomeCents += r.amountCents;
    else if (r.type === "expense") expenseCents += r.amountCents;
    else repaymentCents += r.amountCents;
  }
  return { incomeCents, expenseCents, repaymentCents };
}

// Alle Jahre, in denen es Buchungen gibt (fuer die Jahresauswahl), plus das
// aktuelle Jahr und die Kaufjahre der Objekte (bis zum aktuellen Jahr, damit z. B.
// die anteilige AfA im Kaufjahr auch ohne Buchungen abrufbar ist). Absteigend sortiert.
export function availableYears(transactions: Transaction[], properties: Property[] = []): number[] {
  const years = new Set<number>();
  const current = new Date().getFullYear();
  years.add(current);
  for (const p of properties) {
    const y = Number((p.purchaseDate ?? "").slice(0, 4));
    if (Number.isInteger(y) && y > 1990 && y <= current) years.add(y);
  }
  for (const t of transactions) {
    const y = Number(t.date.slice(0, 4));
    if (Number.isFinite(y) && y > 1990) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}
