// Ertragswertverfahren, vereinfacht nach ImmoWertV (§§ 27 ff.).
// Deterministische Schaetzung, KEIN Gutachten. Alle Geldwerte in Cent.

import type { Property } from "./types";
import { effectiveMonthlyCostsCents, effectiveMonthlyRentCents } from "./finance";

// Mietausfallwagnis in % des Jahresrohertrags. Quelle: ImmoWertV 2021, Anlage 3
// (Modellansätze Bewirtschaftungskosten), Wohnnutzung: 2 % des Rohertrags.
export const RENT_LOSS_RISK_PERCENT = 2;

export type IncomeValuation = {
  landValueCents: number; // Bodenwert = Flaeche × Bodenrichtwert
  annualGrossIncomeCents: number; // Jahresrohertrag (Jahreskaltmiete)
  annualRentLossRiskCents: number; // Mietausfallwagnis p.a. (Teil der Bewirtschaftungskosten)
  annualOperatingCostsCents: number; // Bewirtschaftungskosten p.a. (inkl. Mietausfallwagnis)
  annualNetIncomeCents: number; // Reinertrag = Rohertrag − Bewirtschaftungskosten
  landYieldCents: number; // Bodenwertverzinsung = Bodenwert × Liegenschaftszins
  buildingNetIncomeRawCents: number; // Gebaeudereinertrag vor Begrenzung (kann < 0 sein)
  buildingNetIncomeCents: number; // Gebaeudereinertrag, auf >= 0 begrenzt
  multiplier: number; // Vervielfaeltiger (Barwertfaktor)
  buildingValueCents: number; // Gebaeudeertragswert = Gebaeudereinertrag × V
  incomeValueCents: number; // Ertragswert = Bodenwert + Gebaeudeertragswert
};

// Barwertfaktor einer nachschuessigen Zeitrente: V = (1 − (1+p)^−n) / p.
// p als Dezimalzahl (0.035 = 3,5 %). Sonderfall p = 0 -> V = n.
export function presentValueFactor(p: number, n: number): number {
  if (p === 0) return n;
  return (1 - Math.pow(1 + p, -n)) / p;
}

function isNonNegative(v: number | undefined): v is number {
  return v != null && Number.isFinite(v) && v >= 0;
}

// Liefert null, wenn eine Pflichtangabe (Grundstuecksflaeche, Bodenrichtwert,
// Liegenschaftszins, Restnutzungsdauer) fehlt oder ungueltig (negativ) ist.
//
// Annahme Bewirtschaftungskosten: Wir nehmen effectiveMonthlyCostsCents × 12,
// also die tatsaechlich vom Eigentuemer getragenen (nicht umgelegten) Kosten:
// Versicherung, Grundsteuer, Eigentuemer-Anteil Hausgeld (enthaelt i. d. R.
// Verwaltung + Instandhaltungsruecklage), Sonstiges; bei Ferien-/Eigennutzung
// zusaetzlich Strom/Wasser/Internet. Das entspricht dem Gedanken der ImmoWertV
// (nur nicht umlagefaehige Kosten mindern den Reinertrag). Dazu kommt das
// Mietausfallwagnis (RENT_LOSS_RISK_PERCENT vom Jahresrohertrag). Abweichung:
// modellkonforme Pauschalen fuer Verwaltung/Instandhaltung (Anlage 3 ImmoWertV)
// fehlen weiterhin, der Wert ist daher eher etwas zu hoch.
//
// Annahme negativer Gebaeudereinertrag: Deckt der Reinertrag nicht einmal die
// Bodenwertverzinsung, hat das Gebaeude keinen Ertragswert. Wir begrenzen auf 0
// -> Ertragswert = Bodenwert (ein negativer Gebaeudewert waere unplausibel;
// Freilegungskosten / Liquidationswert bleiben unberuecksichtigt). Der
// unbegrenzte Wert steht in buildingNetIncomeRawCents fuer einen UI-Hinweis.
export function incomeValuation(p: Property): IncomeValuation | null {
  const { landAreaSqm, landRateCentsPerSqm, capRateBasisPoints, remainingLifeYears } = p;
  if (
    !isNonNegative(landAreaSqm) ||
    !isNonNegative(landRateCentsPerSqm) ||
    !isNonNegative(capRateBasisPoints) ||
    !isNonNegative(remainingLifeYears)
  ) {
    return null;
  }

  const rate = capRateBasisPoints / 10000;
  const landValueCents = Math.round(landAreaSqm * landRateCentsPerSqm);
  const annualGrossIncomeCents = effectiveMonthlyRentCents(p) * 12;
  const annualRentLossRiskCents = Math.round(
    (annualGrossIncomeCents * RENT_LOSS_RISK_PERCENT) / 100,
  );
  const annualOperatingCostsCents =
    effectiveMonthlyCostsCents(p) * 12 + annualRentLossRiskCents;
  const annualNetIncomeCents = annualGrossIncomeCents - annualOperatingCostsCents;
  const landYieldCents = Math.round(landValueCents * rate);
  const buildingNetIncomeRawCents = annualNetIncomeCents - landYieldCents;
  const buildingNetIncomeCents = Math.max(0, buildingNetIncomeRawCents);
  const multiplier = presentValueFactor(rate, remainingLifeYears);
  const buildingValueCents = Math.round(buildingNetIncomeCents * multiplier);

  return {
    landValueCents,
    annualGrossIncomeCents,
    annualRentLossRiskCents,
    annualOperatingCostsCents,
    annualNetIncomeCents,
    landYieldCents,
    buildingNetIncomeRawCents,
    buildingNetIncomeCents,
    multiplier,
    buildingValueCents,
    incomeValueCents: landValueCents + buildingValueCents,
  };
}
