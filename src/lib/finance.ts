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

// Effektive monatliche Eigentuemer-Kosten aus den Einzelpositionen,
// abhaengig von der Vermietungsart. Fallback: altes Sammelfeld.
export function effectiveMonthlyCostsCents(p: Property): number {
  const hasItemized =
    p.costElectricityCents != null ||
    p.costWaterCents != null ||
    p.costInternetCents != null ||
    p.costInsuranceCents != null ||
    p.costPropertyTaxCents != null ||
    p.costHausgeldTotalCents != null ||
    p.costOtherCents != null;

  if (!hasItemized) return p.monthlyCostsCents ?? 0;

  const insurance = p.costInsuranceCents ?? 0;
  const propertyTax = p.costPropertyTaxCents ?? 0;
  const other = p.costOtherCents ?? 0;
  const hausgeldOwner = Math.round(
    ((p.costHausgeldTotalCents ?? 0) * (p.hausgeldOwnerPercent ?? 50)) / 100,
  );

  let total = insurance + propertyTax + other + hausgeldOwner;

  // Strom/Wasser/Internet nur, wenn NICHT dauervermietet (dann Mietersache).
  if (p.rentalType !== "Dauervermietung") {
    total +=
      (p.costElectricityCents ?? 0) +
      (p.costWaterCents ?? 0) +
      (p.costInternetCents ?? 0);
  }
  return total;
}

// Effektive Monatsmiete: Summe der Einheiten, sonst das Einzelfeld.
export function effectiveMonthlyRentCents(p: Property): number {
  if (p.unitRents && p.unitRents.length > 0) {
    return p.unitRents.reduce((s, u) => s + (u.rentCents || 0), 0);
  }
  return p.monthlyRentCents;
}

export function calculateKpis(p: Property): PropertyKpis {
  const annualRentCents = effectiveMonthlyRentCents(p) * 12;
  const annualCostsCents = effectiveMonthlyCostsCents(p) * 12;

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
