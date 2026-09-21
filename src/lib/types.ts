// Zentrale Datentypen des Projekts.
// WICHTIG: Alle Geldbetraege sind Ganzzahlen in CENT (z.B. 120050 = 1.200,50 €).

import type { Timestamp } from "firebase/firestore";

// Rechtsform der Immobilie. Fokus liegt auf Privat/GbR (EÜR sinnvoll).
// GmbH ist enthalten, aber steuerlich anders (Bilanz) -> vorerst nur Kennzeichnung.
export type LegalForm = "Privat" | "GbR" | "GmbH";

export const LEGAL_FORMS: LegalForm[] = ["Privat", "GbR", "GmbH"];

// Vermietungsart. Wichtig fuer das Ferienhaus der Eltern:
// - Dauervermietung: feste Kaltmiete pro Monat
// - Ferienvermietung: nur zeitweise vermietet, Einnahmen kommen aus Buchungen (Phase 2b)
// - Eigennutzung: selbst genutzt / leer, keine Mieteinnahmen
export type RentalType = "Dauervermietung" | "Ferienvermietung" | "Eigennutzung";

export const RENTAL_TYPES: RentalType[] = [
  "Dauervermietung",
  "Ferienvermietung",
  "Eigennutzung",
];

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

// Einnahme, Ausgabe oder Sondertilgung. Der Betrag wird immer POSITIV
// gespeichert; das Vorzeichen ergibt sich aus dem Typ.
// "repayment" (Sondertilgung): reduziert die Restschuld, ist aber KEINE
// steuerlich absetzbare Ausgabe -> taucht NICHT in der EÜR auf.
export type TransactionType = "income" | "expense" | "repayment";

// Eine Buchung (Einnahme/Ausgabe), gehoert zu genau einer Immobilie.
export type Transaction = {
  id: string;
  propertyId: string;
  type: TransactionType;
  amountCents: number; // immer positiv
  date: string; // ISO-Datum "YYYY-MM-DD"
  category: TransactionCategory;
  description?: string;
  createdBy: string;
  createdAt?: Timestamp;
};

export type TransactionInput = Omit<Transaction, "id" | "createdAt">;

// Vorzeichenbehafteter Betrag in Cent (Einnahme +, Ausgabe/Sondertilgung -).
export function signedAmountCents(t: Transaction): number {
  return t.type === "income" ? t.amountCents : -t.amountCents;
}

// Ein Rechtsträger (Besitzer): z.B. "Schwan GmbH", "Familie Schwan GbR",
// "Papa privat". Immobilien werden einem Rechtsträger zugeordnet und im
// Dashboard danach gruppiert. Der Jahresabschluss laeuft pro Rechtsträger.
export type Entity = {
  id: string;
  name: string;
  legalForm: LegalForm;
  createdBy: string;
  createdAt?: Timestamp;
};

export type EntityInput = Omit<Entity, "id" | "createdAt">;

// Eine Immobilie (Stammdaten + Kennzahlen-Basiswerte).
export type Property = {
  id: string;
  name: string; // Bezeichnung, z.B. "Musterstraße 1, Karlsruhe"
  address?: string;
  entityId?: string; // zugeordneter Rechtsträger (Entity.id)
  legalForm: LegalForm;
  rentalType: RentalType; // Art der Nutzung/Vermietung
  areaSqm?: number; // Wohnflaeche in m²
  units?: number; // Anzahl Wohnungen/Einheiten
  purchaseDate: string; // ISO-Datum "YYYY-MM-DD"

  // --- Kaufpreis-Aufteilung (Cent) ---
  purchasePriceCents: number; // Gesamt-Kaufpreis
  landValueCents: number; // Grundstuecksanteil (NICHT abschreibbar)
  buildingValueCents: number; // Gebaeudeanteil (Basis fuer die AfA)
  afaRatePercent: number; // Abschreibungssatz p.a., meist 2 (%)

  // --- laufende Werte (Cent) ---
  monthlyRentCents: number; // Gesamt-Monatsmiete (bei Einheiten = Summe von unitRents)
  // Optional: Miete je Einheit (z.B. Mehrfamilienhaus). Wenn gesetzt, ist
  // monthlyRentCents die Summe daraus.
  unitRents?: { label: string; rentCents: number }[];
  monthlyCostsCents: number; // LEGACY: einfaches Sammelfeld (Fallback, wenn keine
  // Einzelpositionen gesetzt sind). Neue Daten nutzen die Positionen unten.
  marketValueCents?: number; // aktueller Marktwert (optional)

  // --- Kostenpositionen pro Monat (Cent, optional) ---
  // Welche davon als Eigentuemer-Kosten zaehlen, haengt vom rentalType ab
  // (siehe effectiveMonthlyCostsCents in lib/finance.ts):
  //  - Dauervermietung: Versicherung + Grundsteuer + Hausgeld-Anteil + Sonstiges
  //    (Strom/Wasser/Internet = Mietersache)
  //  - Ferien/Eigennutzung: zusaetzlich Strom + Wasser + Internet
  costElectricityCents?: number; // Strom
  costWaterCents?: number; // Wasser
  costInternetCents?: number; // Internet
  costInsuranceCents?: number; // Gebaeudeversicherung
  costPropertyTaxCents?: number; // Grundsteuer (anteilig pro Monat)
  costHausgeldTotalCents?: number; // Hausgeld gesamt pro Monat
  hausgeldOwnerPercent?: number; // Anteil, den der Eigentuemer traegt (%), Default 50
  costOtherCents?: number; // Sonstiges

  // --- Finanzierung / Kredit (optional, Annuitätendarlehen) ---
  // Restschuld & Enddatum werden daraus BERECHNET (siehe lib/loan.ts).
  loanOriginalCents?: number; // ursprüngliche Darlehenssumme
  loanInterestRatePercent?: number; // Zinssatz p.a. in %
  loanMonthlyPaymentCents?: number; // monatliche Rate (Zins + Tilgung)
  loanStartDate?: string; // Kreditbeginn (ISO "YYYY-MM-DD")

  createdBy: string; // uid des Anlegers
  createdAt?: Timestamp; // Server-Zeitstempel
};

// Beim Anlegen vergibt Firestore die id + createdAt -> diese Felder weglassen.
export type PropertyInput = Omit<Property, "id" | "createdAt">;
