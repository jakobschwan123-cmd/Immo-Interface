// POST /api/receipts/parse – liest einen Beleg per Gemini aus (Phase 3).
//
// Body: die Datei selbst (roh), Content-Type = Dateityp.
// Header: Authorization: Bearer <Firebase-ID-Token>
// Antwort: ReceiptExtraction (normalisiert) oder { error }.
//
// Sicherheit:
// - ID-Token wird serverseitig geprueft (Signatur gegen Googles securetoken-JWKS,
//   Issuer/Audience = unser Firebase-Projekt, Ablauf, email_verified).
// - E-Mail muss in ALLOWED_EMAILS (server-only) stehen. Fehlt die Variable -> 503.
// - GEMINI_API_KEY bleibt auf dem Server. Nichts wird gespeichert oder geloggt,
//   was Belegdaten enthaelt.

import { GoogleGenAI, Type } from "@google/genai";
import { createRemoteJWKSet, jwtVerify } from "jose";

import {
  MAX_PARSE_BYTES,
  RECEIPT_MIME_TYPES,
  normalizeReceiptExtraction,
} from "@/lib/receipts";
import { TRANSACTION_CATEGORIES } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_MODEL = "gemini-3.8-flash";

// Oeffentliche Schluessel, mit denen Firebase Auth ID-Tokens signiert.
// jose cached sie im Speicher und laedt bei Schluesselwechsel nach.
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  ),
);

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    amount: {
      type: Type.STRING,
      description: "Bruttogesamtbetrag (zu zahlen) in Euro, z. B. \"1.234,56\". Leer, wenn unklar.",
    },
    date: {
      type: Type.STRING,
      description: "Rechnungs-/Belegdatum im Format YYYY-MM-DD. Leer, wenn unklar.",
    },
    description: {
      type: Type.STRING,
      description: "Kurzer Verwendungszweck: Aussteller + Leistung, max. 80 Zeichen.",
    },
    category: { type: Type.STRING, description: "Passendste Kategorie aus der Liste." },
    confidence: { type: Type.NUMBER, description: "Sicherheit der Angaben von 0 bis 1." },
    rawText: { type: Type.STRING, description: "Wichtigste erkannte Textzeilen des Belegs." },
  },
  required: ["amount", "date", "description", "category", "confidence"],
};

function prompt(): string {
  return [
    "Du liest einen deutschen Beleg (Rechnung, Quittung, Bescheid) für die Verwaltung einer vermieteten Immobilie aus.",
    "Gib ausschließlich die Felder des JSON-Schemas zurück.",
    "- amount: der Bruttogesamtbetrag (Endbetrag inkl. MwSt.), nicht Zwischensummen oder Einzelpositionen.",
    "- date: das Rechnungs- bzw. Belegdatum (nicht Fälligkeit oder Leistungszeitraum), Format YYYY-MM-DD.",
    "- description: kurz, z. B. \"Müller Sanitär – Reparatur Heizung\".",
    `- category: eine dieser Kategorien: ${TRANSACTION_CATEGORIES.join(", ")}.`,
    "Erfinde nichts. Wenn ein Wert nicht sicher lesbar ist, gib einen leeren String zurück und senke confidence.",
  ].join("\n");
}

function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.GEMINI_API_KEY;
  const allowedEmails = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  // Ohne vollstaendige Konfiguration NICHT offen lassen.
  if (!projectId || !apiKey || allowedEmails.length === 0) {
    return fail(503, "Belegauslesung ist auf dem Server nicht konfiguriert.");
  }

  // 1) Authentifizierung – vor dem Lesen des Bodys.
  const token = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return fail(401, "Nicht angemeldet.");
  let claims;
  try {
    ({ payload: claims } = await jwtVerify(token, FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ["RS256"],
    }));
  } catch {
    return fail(401, "Anmeldung ungültig oder abgelaufen. Bitte neu laden.");
  }
  const email = typeof claims.email === "string" ? claims.email.toLowerCase() : "";
  const authTime = typeof claims.auth_time === "number" ? claims.auth_time : Infinity;
  if (
    typeof claims.sub !== "string" ||
    !claims.sub ||
    authTime > Date.now() / 1000 ||
    claims.email_verified !== true ||
    !allowedEmails.includes(email)
  ) {
    return fail(403, "Diese E-Mail ist nicht freigeschaltet.");
  }

  // 2) Datei pruefen.
  const mimeType = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!RECEIPT_MIME_TYPES.includes(mimeType)) {
    return fail(415, "Nur Bilder (JPG, PNG, WebP, HEIC) oder PDF.");
  }
  const tooLarge = "Datei zu groß zum Auslesen (max. 4 MB). Bitte kleiner fotografieren oder PDF verkleinern.";
  if (Number(request.headers.get("content-length")) > MAX_PARSE_BYTES) return fail(413, tooLarge);
  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length === 0) return fail(400, "Leere Datei.");
  if (bytes.length > MAX_PARSE_BYTES) return fail(413, tooLarge);

  // 3) Gemini.
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt() }, { inlineData: { mimeType, data: bytes.toString("base64") } }],
        },
      ],
      config: { responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA },
    });
    return Response.json(normalizeReceiptExtraction(response.text ?? ""));
  } catch (err) {
    // Nur Fehlerart/Status loggen – nie Inhalte (koennten Belegdaten enthalten).
    const status = (err as { status?: unknown })?.status;
    console.error("[receipts/parse] Gemini-Fehler", err instanceof Error ? err.name : "unbekannt", status ?? "");
    return fail(502, "Beleg konnte nicht ausgelesen werden. Bitte manuell erfassen.");
  }
}
