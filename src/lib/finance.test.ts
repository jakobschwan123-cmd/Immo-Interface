import { afterEach, describe, expect, it, vi } from "vitest";
import {
  afaForYear,
  calculateKpis,
  effectiveMonthlyCostsCents,
  effectiveMonthlyRentCents,
  sumKpis,
} from "./finance";
import type { Property, Transaction } from "./types";

// Basis-Objekt: Gebäudeanteil 100.000 EUR, 2 % -> Jahres-AfA 2.000 EUR (200.000 Cent).
function prop(over: Partial<Property> = {}): Property {
  return {
    id: "p1",
    name: "Testobjekt",
    legalForm: "Privat",
    rentalType: "Dauervermietung",
    purchaseDate: "2020-01-01",
    purchasePriceCents: 20_000_000,
    landValueCents: 10_000_000,
    buildingValueCents: 10_000_000,
    afaRatePercent: 2,
    monthlyRentCents: 0,
    monthlyCostsCents: 0,
    createdBy: "test",
    ...over,
  } as Property;
}

describe("afaForYear (§ 7 Abs. 4 EStG, Kaufmonat zählt voll)", () => {
  const p = prop({ purchaseDate: "2025-07-15" });

  it("Kauf 15.07. -> 6/12 im Kaufjahr", () => {
    expect(afaForYear(p, 2025)).toBe(100_000);
  });
  it("Kauf im Vorjahr -> 12/12", () => {
    expect(afaForYear(p, 2026)).toBe(200_000);
    expect(afaForYear(p, 2040)).toBe(200_000);
  });
  it("Jahr vor dem Kauf -> 0", () => {
    expect(afaForYear(p, 2024)).toBe(0);
  });
  it("Kauf im Januar -> 12/12, Kauf im Dezember -> 1/12 (gerundet)", () => {
    expect(afaForYear({ ...p, purchaseDate: "2025-01-01" }, 2025)).toBe(200_000);
    expect(afaForYear({ ...p, purchaseDate: "2025-01-31" }, 2025)).toBe(200_000);
    expect(afaForYear({ ...p, purchaseDate: "2025-12-31" }, 2025)).toBe(16_667); // 16.666,67 -> 16.667
  });
  it("Monatsgrenze: Kauf 30.06. -> 7/12, Kauf 01.07. -> 6/12", () => {
    expect(afaForYear({ ...p, purchaseDate: "2025-06-30" }, 2025)).toBe(116_667);
    expect(afaForYear({ ...p, purchaseDate: "2025-07-01" }, 2025)).toBe(100_000);
  });
  it("Rundung auf ganze Cent (Jahresbetrag und Teiljahr)", () => {
    // 1.234.567 * 2 % = 24.691,34 -> 24.691
    const odd = prop({ buildingValueCents: 1_234_567, purchaseDate: "2025-05-10" });
    expect(afaForYear(odd, 2026)).toBe(24_691);
    // Mai = 8/12 von 24.691 = 16.460,67 -> 16.461
    expect(afaForYear(odd, 2025)).toBe(16_461);
    expect(Number.isInteger(afaForYear(odd, 2025))).toBe(true);
  });
  it("fehlendes/ungültiges purchaseDate -> voller Jahresbetrag (so im Code definiert)", () => {
    for (const purchaseDate of [undefined, "", "foo", "2025-13-01", "2025-00-10", "2025-7-15"]) {
      const q = { ...p, purchaseDate } as unknown as Property;
      expect(afaForYear(q, 2025)).toBe(200_000);
      expect(afaForYear(q, 1990)).toBe(200_000); // auch vor "Kauf" – es gibt keinen Kaufzeitpunkt
    }
  });
  it("AfA-Satz 0 oder Gebäudeanteil 0 -> 0", () => {
    expect(afaForYear({ ...p, afaRatePercent: 0 }, 2026)).toBe(0);
    expect(afaForYear({ ...p, buildingValueCents: 0 }, 2026)).toBe(0);
  });
  it("anderer Satz (3 %) wird verwendet", () => {
    expect(afaForYear({ ...p, afaRatePercent: 3 }, 2026)).toBe(300_000);
  });
});

describe("afaForYear: Ende der Abschreibung", () => {
  // Kauf 03/1970: 10/12 im Kaufjahr = 166.667, dann 200.000/Jahr bis 10.000.000 erreicht.
  const alt = prop({ purchaseDate: "1970-03-01" });

  it("vor Ende volle AfA", () => {
    expect(afaForYear(alt, 2019)).toBe(200_000);
  });
  it("letztes Jahr nur der Restbuchwert", () => {
    expect(afaForYear(alt, 2020)).toBe(33_333);
  });
  it("danach 0", () => {
    expect(afaForYear(alt, 2021)).toBe(0);
    expect(afaForYear(alt, 2026)).toBe(0);
  });
  it("Summe aller Jahre = Gebäudewert", () => {
    let sum = 0;
    for (let y = 1970; y <= 2030; y++) sum += afaForYear(alt, y);
    expect(sum).toBe(10_000_000);
  });
});

describe("effectiveMonthlyRentCents", () => {
  it("ohne Einheiten: Einzelfeld", () => {
    expect(effectiveMonthlyRentCents(prop({ monthlyRentCents: 90_000 }))).toBe(90_000);
  });
  it("leere unitRents: Fallback auf Einzelfeld", () => {
    expect(effectiveMonthlyRentCents(prop({ monthlyRentCents: 90_000, unitRents: [] }))).toBe(90_000);
  });
  it("mit Einheiten: Summe der Einheiten (Einzelfeld wird ignoriert)", () => {
    const p = prop({
      monthlyRentCents: 1,
      unitRents: [
        { label: "EG", rentCents: 60_000 },
        { label: "OG", rentCents: 45_000 },
      ],
    });
    expect(effectiveMonthlyRentCents(p)).toBe(105_000);
  });
});

describe("effectiveMonthlyCostsCents", () => {
  it("ohne Einzelpositionen: Legacy-Sammelfeld", () => {
    expect(effectiveMonthlyCostsCents(prop({ monthlyCostsCents: 25_000 }))).toBe(25_000);
  });
  it("Dauervermietung: Strom/Wasser/Internet sind Mietersache", () => {
    const p = prop({
      monthlyCostsCents: 999, // wird ignoriert, sobald Positionen existieren
      costElectricityCents: 4_000,
      costWaterCents: 2_000,
      costInternetCents: 3_000,
      costInsuranceCents: 5_000,
      costPropertyTaxCents: 3_000,
      costHausgeldTotalCents: 20_000, // 50 % Default -> 10.000
      costOtherCents: 2_000,
    });
    expect(effectiveMonthlyCostsCents(p)).toBe(5_000 + 3_000 + 10_000 + 2_000);
  });
  it("Nicht-Dauervermietung: Strom/Wasser/Internet zählen mit", () => {
    const base = {
      costElectricityCents: 4_000,
      costWaterCents: 2_000,
      costInternetCents: 3_000,
      costInsuranceCents: 5_000,
    };
    const types = ["Ferienvermietung", "Eigennutzung"] as unknown as Property["rentalType"][];
    for (const rentalType of types) {
      expect(effectiveMonthlyCostsCents(prop({ ...base, rentalType }))).toBe(14_000);
    }
  });
  it("Hausgeld-Anteil: Default 50 %, explizit 0 % bleibt 0, 100 % voll, Rundung", () => {
    const h = { costHausgeldTotalCents: 20_001 };
    expect(effectiveMonthlyCostsCents(prop(h))).toBe(10_001); // 10.000,5 -> 10.001
    expect(effectiveMonthlyCostsCents(prop({ ...h, hausgeldOwnerPercent: 0 }))).toBe(0);
    expect(effectiveMonthlyCostsCents(prop({ ...h, hausgeldOwnerPercent: 100 }))).toBe(20_001);
  });
  it("nur Strom gesetzt bei Dauervermietung -> 0 (Einzelposition aktiv, Legacy-Feld ignoriert)", () => {
    const p = prop({ monthlyCostsCents: 7_000, costElectricityCents: 4_000 });
    expect(effectiveMonthlyCostsCents(p)).toBe(0);
  });
});

describe("calculateKpis", () => {
  // Realistisches MFH: Kaufpreis 300.000, Gebäude 240.000 (2 % -> 4.800/Jahr),
  // 2 Einheiten à 600 + 450 EUR, Dauervermietung.
  const mfh = prop({
    purchasePriceCents: 30_000_000,
    landValueCents: 6_000_000,
    buildingValueCents: 24_000_000,
    monthlyRentCents: 105_000,
    unitRents: [
      { label: "EG", rentCents: 60_000 },
      { label: "OG", rentCents: 45_000 },
    ],
    costInsuranceCents: 5_000,
    costPropertyTaxCents: 3_000,
    costHausgeldTotalCents: 20_000,
    costOtherCents: 2_000,
    units: 2,
  });

  it("Beispielobjekt: Miete, Kosten, AfA, Überschuss, Renditen", () => {
    const k = calculateKpis(mfh);
    expect(k.annualRentCents).toBe(1_260_000);
    expect(k.annualCostsCents).toBe(240_000);
    expect(k.annualAfaCents).toBe(480_000);
    expect(k.annualSurplusCents).toBe(1_260_000 - 240_000 - 480_000);
    expect(k.grossYieldPercent).toBeCloseTo(4.2, 10);
    expect(k.netYieldPercent).toBeCloseTo(3.4, 10);
  });

  it("annualAfaCents ist unabhängig vom Kaufdatum (volle Jahres-AfA, anders als afaForYear)", () => {
    const k = calculateKpis({ ...mfh, purchaseDate: "2025-12-01" });
    expect(k.annualAfaCents).toBe(480_000);
    expect(afaForYear({ ...mfh, purchaseDate: "2025-12-01" }, 2025)).toBe(40_000);
  });

  it("0 Einheiten / keine Miete / keine Kosten / kein Kredit", () => {
    const k = calculateKpis(prop({ units: 0, monthlyRentCents: 0, unitRents: [] }));
    expect(k.annualRentCents).toBe(0);
    expect(k.annualCostsCents).toBe(0);
    expect(k.annualAfaCents).toBe(200_000);
    expect(k.annualSurplusCents).toBe(-200_000); // nur AfA -> negativer Überschuss
    expect(k.grossYieldPercent).toBe(0);
    expect(k.netYieldPercent).toBe(0);
  });

  it("Kaufpreis 0 -> Renditen 0 statt Infinity/NaN", () => {
    const k = calculateKpis(prop({ purchasePriceCents: 0, monthlyRentCents: 50_000 }));
    expect(k.grossYieldPercent).toBe(0);
    expect(k.netYieldPercent).toBe(0);
    expect(k.annualRentCents).toBe(600_000);
  });

  it("Legacy-Kosten und Einzelmiete (ohne unitRents)", () => {
    const k = calculateKpis(
      prop({ monthlyRentCents: 80_000, monthlyCostsCents: 20_000, buildingValueCents: 0 }),
    );
    expect(k.annualRentCents).toBe(960_000);
    expect(k.annualCostsCents).toBe(240_000);
    expect(k.annualAfaCents).toBe(0);
    expect(k.annualSurplusCents).toBe(720_000);
  });

  it("Kosten über Miete -> negative Netto-Rendite", () => {
    const k = calculateKpis(
      prop({ purchasePriceCents: 10_000_000, monthlyRentCents: 10_000, monthlyCostsCents: 30_000 }),
    );
    expect(k.netYieldPercent).toBeLessThan(0);
    expect(k.netYieldPercent).toBeCloseTo(((120_000 - 360_000) / 10_000_000) * 100, 10);
  });
});

describe("sumKpis", () => {
  afterEach(() => vi.useRealTimers());

  const a = prop({
    id: "a",
    purchasePriceCents: 20_000_000,
    buildingValueCents: 10_000_000,
    monthlyRentCents: 80_000,
    monthlyCostsCents: 10_000,
    marketValueCents: 25_000_000,
  });
  const b = prop({
    id: "b",
    purchasePriceCents: 10_000_000,
    buildingValueCents: 5_000_000,
    monthlyRentCents: 40_000,
    monthlyCostsCents: 5_000,
  });

  it("leere Liste -> alles 0", () => {
    expect(sumKpis([])).toEqual({
      totalPurchaseCents: 0,
      totalMarketValueCents: 0,
      totalLoanRemainingCents: 0,
      annualRentCents: 0,
      annualCostsCents: 0,
      annualAfaCents: 0,
      annualSurplusCents: 0,
    });
  });

  it("summiert Kennzahlen; fehlender Marktwert zählt als 0; ohne Kredit Restschuld 0", () => {
    const s = sumKpis([a, b]);
    expect(s.totalPurchaseCents).toBe(30_000_000);
    expect(s.totalMarketValueCents).toBe(25_000_000);
    expect(s.totalLoanRemainingCents).toBe(0);
    expect(s.annualRentCents).toBe(960_000 + 480_000);
    expect(s.annualCostsCents).toBe(120_000 + 60_000);
    expect(s.annualAfaCents).toBe(200_000 + 100_000);
    expect(s.annualSurplusCents).toBe(
      calculateKpis(a).annualSurplusCents + calculateKpis(b).annualSurplusCents,
    );
  });

  it("Restschuld berücksichtigt nur Sondertilgungen (repayment) des jeweiligen Objekts", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2020-01-15T12:00:00")); // Kreditbeginn-Monat, keine Rate gelaufen
    const la = {
      ...a,
      loanOriginalCents: 10_000_000,
      loanInterestRatePercent: 3,
      loanMonthlyPaymentCents: 50_000,
      loanStartDate: "2020-01-01",
    };
    const tx = (id: string, propertyId: string, type: Transaction["type"], amountCents: number) =>
      ({
        id,
        propertyId,
        type,
        amountCents,
        date: "2020-01-10",
        category: "Sonstiges",
        createdBy: "t",
      }) as Transaction;

    expect(sumKpis([la, b]).totalLoanRemainingCents).toBe(10_000_000);
    const txs = [
      tx("1", "a", "repayment", 1_000_000),
      tx("2", "b", "repayment", 9_999_999), // anderes Objekt (b hat keinen Kredit)
      tx("3", "a", "expense", 5_000_000), // keine Sondertilgung
    ];
    expect(sumKpis([la, b], txs).totalLoanRemainingCents).toBe(9_000_000);
  });
});
