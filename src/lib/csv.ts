// Kleine Helfer fuer den CSV-Export (Excel-freundlich, Deutsch).

import type { Euer } from "./euer";

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
