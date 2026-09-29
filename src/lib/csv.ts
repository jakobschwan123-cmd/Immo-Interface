// Kleine Helfer fuer den CSV-Export (Excel-freundlich, Deutsch).

import type { Euer, JournalRow } from "./euer";
import { journalTotals } from "./euer";

// Cent -> "1200,50" (Komma als Dezimaltrennzeichen, ohne Waehrungssymbol).
function centsToPlain(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

// Ein CSV-Feld sicher escapen (Semikolon/Anfuehrungszeichen/Zeilenumbruch).
function cell(value: string): string {
  if (/[";\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// EÜR -> CSV-Text. Semikolon als Trennzeichen (Excel de-DE).
export function euerToCsv(euer: Euer, title: string): string {
  const rows: string[][] = [];
  rows.push([`EÜR ${euer.year} – ${title}`]);
  rows.push([]);
  rows.push(["Einnahmen", "Betrag (EUR)"]);
  for (const line of euer.income) rows.push([line.label, centsToPlain(line.amountCents)]);
  rows.push(["Summe Einnahmen", centsToPlain(euer.incomeTotalCents)]);
  rows.push([]);
  rows.push(["Ausgaben", "Betrag (EUR)"]);
  for (const line of euer.expenses) rows.push([line.label, centsToPlain(line.amountCents)]);
  rows.push(["Summe Ausgaben", centsToPlain(euer.expenseTotalCents)]);
  rows.push([]);
  rows.push(["Überschuss / Verlust", centsToPlain(euer.surplusCents)]);

  return rows.map((r) => r.map(cell).join(";")).join("\n");
}

export const JOURNAL_TYPE_LABEL: Record<JournalRow["type"], string> = {
  income: "Einnahme",
  expense: "Ausgabe",
  repayment: "Sondertilgung (nicht EÜR)",
};

// Buchungsjournal -> CSV (Datum als TT.MM.JJJJ, Betrag vorzeichenbehaftet).
export function journalToCsv(rows: JournalRow[], year: number, title: string): string {
  const out: string[][] = [];
  out.push([`Buchungsjournal ${year} – ${title}`]);
  out.push([]);
  out.push(["Datum", "Immobilie", "Kategorie", "Text", "Art", "Betrag (EUR)"]);
  for (const r of rows) {
    const [y, m, d] = r.date.split("-");
    const signed = r.type === "income" ? r.amountCents : -r.amountCents;
    out.push([
      `${d}.${m}.${y}`,
      r.propertyName,
      r.category,
      r.description,
      JOURNAL_TYPE_LABEL[r.type],
      centsToPlain(signed),
    ]);
  }
  const t = journalTotals(rows);
  out.push([]);
  out.push(["Summe Einnahmen", "", "", "", "", centsToPlain(t.incomeCents)]);
  out.push(["Summe Ausgaben (ohne AfA)", "", "", "", "", centsToPlain(t.expenseCents)]);
  out.push(["Summe Sondertilgungen (nicht in EÜR)", "", "", "", "", centsToPlain(t.repaymentCents)]);
  return out.map((r) => r.map(cell).join(";")).join("\n");
}

// Text als Datei herunterladen (nur im Browser).
export function downloadTextFile(
  filename: string,
  content: string,
  mime = "text/csv;charset=utf-8",
): void {
  // BOM voranstellen, damit Excel Umlaute korrekt erkennt.
  const blob = new Blob(["﻿" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
