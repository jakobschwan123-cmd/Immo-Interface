// Belege (Phase 3): gemeinsame Konstanten + reine Normalisierung der Gemini-Antwort.
// Bewusst OHNE Firebase-Import, damit der Route Handler (Server) diese Datei
// nutzen kann, ohne das Client-SDK mitzuziehen. Der Storage-Upload liegt in
// src/components/receipt-upload.tsx.

import { euroInputToCents } from "./money";

// Vorschlag aus einem Beleg. Alles optional (null), weil die KI sich irren oder
// nichts finden kann – der Nutzer bestaetigt/korrigiert immer selbst.
export type ReceiptExtraction = {
  amountCents: number | null; // Bruttobetrag in CENT (Ganzzahl > 0)
  date: string | null; // Belegdatum "YYYY-MM-DD"
  description: string | null; // Zweck / Kurztext, z. B. "Rechnung Sanitär Müller"
  categorySuggestion: string | null; // freier Text, Abgleich mit Kategorien macht die UI
  confidence?: number | null; // 0..1, Selbsteinschaetzung der KI
  rawText?: string | null; // erkannter Text (gekuerzt), nur zur Kontrolle
};

// Erlaubte Dateitypen. Muss zu storage.rules passen (dort gleiche Liste).
// Kein SVG o. ae.: nur, was Gemini lesen kann.
export const RECEIPT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
];

// Storage-Limit (siehe storage.rules).
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
// Vercel begrenzt Request-Bodies auf ca. 4,5 MB -> mit Puffer 4 MB fuer die API.
export const MAX_PARSE_BYTES = 4 * 1024 * 1024;

const MAX_DESCRIPTION = 200;
const MAX_CATEGORY = 60;
const MAX_RAW_TEXT = 4000;

export const EMPTY_EXTRACTION: ReceiptExtraction = {
  amountCents: null,
  date: null,
  description: null,
  categorySuggestion: null,
  confidence: null,
  rawText: null,
};

// Betrag (Zahl in Euro oder Euro-String wie "1.234,56 €") -> Cent oder null.
export function parseAmountCents(value: unknown): number | null {
  let cents: number;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    cents = Math.round(value * 100);
  } else if (typeof value === "string") {
    // Waehrung nur am Anfang/Ende entfernen ("12 Euro 50" darf nicht 1250 € werden).
    const s = value
      .trim()
      .replace(/^(€|eur(o)?)\s*|\s*(€|eur(o)?)$/gi, "")
      .replace(/\s/g, "");
    // Nur Ziffern mit . und , – sonst lieber nichts als Unsinn.
    if (!/^\d[\d.,]*$/.test(s)) return null;
    cents = euroInputToCents(s);
  } else {
    return null;
  }
  // 0/negativ (Gutschrift?) bewusst nicht vorschlagen – manuell erfassen.
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

// Datum "YYYY-MM-DD" oder "DD.MM.YYYY" -> "YYYY-MM-DD", nur echte Kalendertage.
export function parseIsoDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const de = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s);
  const [y, m, d] = iso
    ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    : de
      ? [Number(de[3]), Number(de[2]), Number(de[1])]
      : [NaN, NaN, NaN];
  if (!y || y < 1900 || y > 2100) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null; // z. B. 30.02.
  return date.toISOString().slice(0, 10);
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  return s ? s.slice(0, max) : null;
}

// Gemini-Antwort (JSON-String oder bereits geparstes Objekt) -> ReceiptExtraction.
// Stuerzt nie ab: Ungueltiges wird zu null.
export function normalizeReceiptExtraction(input: unknown): ReceiptExtraction {
  let data = input;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return { ...EMPTY_EXTRACTION };
    }
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ...EMPTY_EXTRACTION };
  }
  const o = data as Record<string, unknown>;
  const conf = typeof o.confidence === "number" ? o.confidence : NaN;
  return {
    amountCents: parseAmountCents(o.amount),
    date: parseIsoDate(o.date),
    description: cleanText(o.description, MAX_DESCRIPTION),
    categorySuggestion: cleanText(o.category, MAX_CATEGORY),
    confidence: conf >= 0 && conf <= 1 ? conf : null,
    rawText: cleanText(o.rawText, MAX_RAW_TEXT),
  };
}
