import { describe, expect, it } from "vitest";
import { incomeValuation, presentValueFactor } from "./valuation";
import type { Property } from "./types";

// Rechenbeispiel: 500 m² × 300 €/m², Kaltmiete 1.500 €/Monat, Kosten 300 €/Monat,
// Liegenschaftszins 3,5 %, Restnutzungsdauer 40 Jahre, Mietausfallwagnis 2 % vom Rohertrag.
function prop(over: Partial<Property> = {}): Property {
  return {
    id: "p1",
    name: "Testobjekt",
    legalForm: "Privat",
    rentalType: "Dauervermietung",
    purchaseDate: "2020-01-01",
    purchasePriceCents: 0,
    landValueCents: 0,
    buildingValueCents: 0,
    afaRatePercent: 2,
    monthlyRentCents: 150_000,
    monthlyCostsCents: 30_000,
    landAreaSqm: 500,
    landRateCentsPerSqm: 30_000,
    capRateBasisPoints: 350,
    remainingLifeYears: 40,
    createdBy: "test",
    ...over,
  } as Property;
}

describe("presentValueFactor", () => {
  it("3,5 % / 40 Jahre ≈ 21,36 (Tabellenwert)", () => {
    expect(presentValueFactor(0.035, 40)).toBeCloseTo(21.3551, 4);
  });
  it("p = 0 -> V = n", () => {
    expect(presentValueFactor(0, 25)).toBe(25);
  });
});

describe("incomeValuation", () => {
  it("Rechenbeispiel mit nachgerechneten Zwischenschritten", () => {
    const v = incomeValuation(prop())!;
    expect(v.landValueCents).toBe(15_000_000); // 150.000 €
    expect(v.annualGrossIncomeCents).toBe(1_800_000); // 18.000 €
    expect(v.annualRentLossRiskCents).toBe(36_000); // 2 % von 18.000 € = 360 €
    expect(v.annualOperatingCostsCents).toBe(396_000); // 3.600 € + 360 € = 3.960 €
    expect(v.annualNetIncomeCents).toBe(1_404_000); // 14.040 €
    expect(v.landYieldCents).toBe(525_000); // 5.250 €
    expect(v.buildingNetIncomeCents).toBe(879_000); // 8.790 €
    expect(v.buildingValueCents).toBe(18_771_109); // 8.790 € × 21,35507
    expect(v.incomeValueCents).toBe(33_771_109); // ≈ 337.711,09 €
  });

  it("p = 0 -> Gebaeudereinertrag × n, keine Bodenwertverzinsung", () => {
    const v = incomeValuation(prop({ capRateBasisPoints: 0, remainingLifeYears: 10 }))!;
    expect(v.multiplier).toBe(10);
    expect(v.landYieldCents).toBe(0);
    expect(v.incomeValueCents).toBe(15_000_000 + 1_404_000 * 10);
  });

  it("fehlende oder negative Pflichtangaben -> null", () => {
    expect(incomeValuation(prop({ landAreaSqm: undefined }))).toBeNull();
    expect(incomeValuation(prop({ landRateCentsPerSqm: undefined }))).toBeNull();
    expect(incomeValuation(prop({ capRateBasisPoints: undefined }))).toBeNull();
    expect(incomeValuation(prop({ remainingLifeYears: undefined }))).toBeNull();
    expect(incomeValuation(prop({ remainingLifeYears: -1 }))).toBeNull();
  });

  it("negativer Gebaeudereinertrag -> auf 0 begrenzt, Ertragswert = Bodenwert", () => {
    // Reinertrag 14.040 € < Bodenwertverzinsung 3,5 % von 600.000 € = 21.000 €
    const v = incomeValuation(prop({ landRateCentsPerSqm: 120_000 }))!;
    expect(v.buildingNetIncomeRawCents).toBe(1_404_000 - 2_100_000);
    expect(v.buildingNetIncomeCents).toBe(0);
    expect(v.incomeValueCents).toBe(v.landValueCents);
  });
});
