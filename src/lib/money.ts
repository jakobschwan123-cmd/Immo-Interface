// Geld-Helfer. Grundregel: intern rechnen wir IMMER in Cent (Ganzzahlen).
// Nur fuer Anzeige/Eingabe wird in Euro umgerechnet.

// Cent -> formatierter Euro-String, z.B. 120050 -> "1.200,50 €"
export function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

// Cent -> reine Euro-Zahl fuer Eingabefelder, z.B. 120050 -> "1200.50"
// (Punkt als Dezimaltrennzeichen, damit es in <input type="number"> passt.)
export function centsToEuroInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

// Euro-Eingabe -> Cent. Akzeptiert "1200,50", "1.200,50" und "1200.50".
// Gibt bei ungueltiger Eingabe 0 zurueck.
export function euroInputToCents(input: string): number {
  if (!input) return 0;
  // Tausenderpunkte entfernen, Komma zu Punkt machen.
  const normalized = input
    .trim()
    .replace(/\./g, "") // Tausenderpunkte weg
    .replace(",", "."); // Dezimalkomma -> Punkt
  const euros = Number(normalized);
  if (!Number.isFinite(euros)) return 0;
  // Auf Cent runden, um Fliesskomma-Ungenauigkeiten zu vermeiden.
  return Math.round(euros * 100);
}

// Prozent-Anzeige, z.B. 3.456 -> "3,46 %"
export function formatPercent(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}
