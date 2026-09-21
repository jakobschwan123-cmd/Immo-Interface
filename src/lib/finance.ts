// Kennzahlen-Berechnungen fuer eine Immobilie.
// Alle Geldwerte in Cent rein und raus. Prozentwerte als "echte" Prozentzahl
// (z.B. 3.46 fuer 3,46 %), passend zu formatPercent().

import type { Property, Transaction } from "./types";
import { computeLoan } from "./loan";

export type PropertyKpis = {
  annualRentCents: number; // Jahres-Kaltmiete
  annualCostsCents: number; // laufende Jahreskosten (nicht umlegbar)
  annualAfaCents: number; // Abschreibung pro Jahr (nur Gebaeudeanteil)
  annualSurplusCents: number; // vereinfachter Ueberschuss vor Steuer
  grossYieldPercent: number; // Brutto-Mietrendite (Jahresmiete / Kaufpreis)
  netYieldPercent: number; // Netto-Mietrendite ((Miete - Kosten) / Kaufpreis)
};

export function calculateKpis(p: Property): PropertyKpis {
  const annualRentCents = p.monthlyRentCents * 12;
  const annualCostsCents = p.monthlyCostsCents * 12;

  // AfA: Abschreibungssatz auf den GEBAEUDEanteil (Grundstueck wird nicht
  // abgeschrieben). afaRatePercent ist z.B. 2 -> 2 % pro Jahr.
  const annualAfaCents = Math.round(
    (p.buildingValueCents * p.afaRatePercent) / 100,
  );

  // Vereinfachter steuerlicher Ueberschuss: Miete - laufende Kosten - AfA.
  // (Finanzierungszinsen etc. kommen ueber die Buchungen in Phase 2b/4 dazu.)
  const annualSurplusCents = annualRentCents - annualCostsCents - annualAfaCents;

  // Renditen auf Basis des Kaufpreises. Division durch 0 abfangen.
  const grossYieldPercent =
    p.purchasePriceCents > 0
      ? (annualRentCents / p.purchasePriceCents) * 100
      : 0;
  const netYieldPercent =
    p.purchasePriceCents > 0
      ? ((annualRentCents - annualCostsCents) / p.purchasePriceCents) * 100
      : 0;

  return {
    annualRentCents,
    annualCostsCents,
    annualAfaCents,
    annualSurplusCents,
    grossYieldPercent,
    netYieldPercent,
  };
}

// Summiert Kennzahlen ueber mehrere Immobilien (fuer die Dashboard-Uebersicht).
// transactions optional -> nur fuer die Restschuld (Sondertilgungen) noetig.
export function sumKpis(properties: Property[], transactions: Transaction[] = []) {
  return properties.reduce(
    (acc, p) => {
      const k = calculateKpis(p);
      const repayments = transactions
        .filter((t) => t.type === "repayment" && t.propertyId === p.id)
        .map((t) => ({ amountCents: t.amountCents, date: t.date }));
      acc.totalPurchaseCents += p.purchasePriceCents;
      acc.totalMarketValueCents += p.marketValueCents ?? 0;
      acc.totalLoanRemainingCents += computeLoan(p, repayments).remainingCents;
      acc.annualRentCents += k.annualRentCents;
      acc.annualCostsCents += k.annualCostsCents;
      acc.annualAfaCents += k.annualAfaCents;
      acc.annualSurplusCents += k.annualSurplusCents;
      return acc;
    },
    {
      totalPurchaseCents: 0,
      totalMarketValueCents: 0,
      totalLoanRemainingCents: 0,
      annualRentCents: 0,
      annualCostsCents: 0,
      annualAfaCents: 0,
      annualSurplusCents: 0,
    },
  );
}
