// Zentrale Datentypen des Projekts.
// WICHTIG: Alle Geldbetraege sind Ganzzahlen in CENT (z.B. 120050 = 1.200,50 €).

import type { Timestamp } from "firebase/firestore";

// Rechtsform der Immobilie. Fokus liegt auf Privat/GbR (EÜR sinnvoll).
// GmbH ist enthalten, aber steuerlich anders (Bilanz) -> vorerst nur Kennzeichnung.
export type LegalForm = "Privat" | "GbR" | "GmbH";

export const LEGAL_FORMS: LegalForm[] = ["Privat", "GbR", "GmbH"];

// Kategorien fuer Buchungen (Phase 2b). Fest definiert, damit der
// Jahresabschluss (Phase 4) sauber gruppieren kann.
export type TransactionCategory =
  | "Mieteinnahme"
  | "Nebenkosten-Vorauszahlung"
  | "Instandhaltung"
  | "Grundsteuer"
  | "Versicherung"
  | "Verwaltung"
  | "Finanzierungszins"
  | "Sonstiges";

export const TRANSACTION_CATEGORIES: TransactionCategory[] = [
  "Mieteinnahme",
  "Nebenkosten-Vorauszahlung",
  "Instandhaltung",
  "Grundsteuer",
  "Versicherung",
  "Verwaltung",
  "Finanzierungszins",
  "Sonstiges",
];

// Eine Immobilie (Stammdaten + Kennzahlen-Basiswerte).
export type Property = {
  id: string;
  name: string; // Bezeichnung, z.B. "Musterstraße 1, Karlsruhe"
  address?: string;
  legalForm: LegalForm;
  purchaseDate: string; // ISO-Datum "YYYY-MM-DD"

  // --- Kaufpreis-Aufteilung (Cent) ---
  purchasePriceCents: number; // Gesamt-Kaufpreis
  landValueCents: number; // Grundstuecksanteil (NICHT abschreibbar)
  buildingValueCents: number; // Gebaeudeanteil (Basis fuer die AfA)
  afaRatePercent: number; // Abschreibungssatz p.a., meist 2 (%)

  // --- laufende Werte (Cent) ---
  monthlyRentCents: number; // erwartete Kaltmiete pro Monat
  monthlyCostsCents: number; // laufende, nicht umlegbare Kosten pro Monat
  marketValueCents?: number; // aktueller Marktwert (optional)

  createdBy: string; // uid des Anlegers
  createdAt?: Timestamp; // Server-Zeitstempel
};

// Beim Anlegen vergibt Firestore die id + createdAt -> diese Felder weglassen.
export type PropertyInput = Omit<Property, "id" | "createdAt">;
