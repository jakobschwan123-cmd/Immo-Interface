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

// Euro-Eingabe -> Cent. Erkennt robust deutsche UND englische Schreibweise:
// "1200,50", "1.200,50", "1200.50", "230000.00", "1.200" (=1200), "1200".
// Gibt bei ungueltiger Eingabe 0 zurueck.
export function euroInputToCents(input: string): number {
  if (!input) return 0;
  let s = input.trim().replace(/\s/g, "");

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    // Beide vorhanden: das ZULETZT stehende Zeichen ist das Dezimaltrennzeichen,
    // das andere ist Tausendertrennzeichen.
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", "."); // Punkt = Tausender, Komma = Dezimal
    } else {
      s = s.replace(/,/g, ""); // Komma = Tausender, Punkt = Dezimal
    }
  } else if (hasComma) {
    // Nur Komma -> Dezimaltrennzeichen.
    s = s.replace(",", ".");
  } else if (hasDot) {
    // Nur Punkt: mehrdeutig. Genau ein Punkt mit 1-2 Nachkommastellen = Dezimal
    // (z.B. "230000.00", "1200.5"), sonst Tausenderpunkt(e) (z.B. "1.200").
    const parts = s.split(".");
    const looksDecimal =
      parts.length === 2 && parts[1].length >= 1 && parts[1].length <= 2;
    if (!looksDecimal) s = s.replace(/\./g, "");
  }

  const euros = Number(s);
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
