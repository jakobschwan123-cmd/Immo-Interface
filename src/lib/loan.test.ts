import { afterEach, describe, expect, it, vi } from "vitest";
import { computeLoan, loanInterestForYear } from "./loan";
import type { Property } from "./types";

// 200.000 EUR, 3 % p.a., Rate 1.000 EUR, Beginn Januar 2020.
const p = {
  id: "l",
  loanOriginalCents: 20_000_000,
  loanInterestRatePercent: 3,
  loanMonthlyPaymentCents: 100_000,
  loanStartDate: "2020-01-01",
} as Property;

describe("A3: loanInterestForYear", () => {
  it("Zins + Tilgung = Jahresrate (volles Folgejahr)", () => {
    const y = loanInterestForYear(p, 2021);
    expect(y.interestCents + y.principalCents).toBe(12 * 100_000);
    expect(y.extraRepaymentCents).toBe(0);
  });

  it("Kreditbeginn-Monat hat noch keine Rate (11 Raten im Startjahr)", () => {
    const y = loanInterestForYear(p, 2020);
    expect(y.interestCents + y.principalCents).toBe(11 * 100_000);
  });

  it("Zins sinkt mit fortschreitender Tilgung", () => {
    expect(loanInterestForYear(p, 2022).interestCents).toBeLessThan(
      loanInterestForYear(p, 2021).interestCents,
    );
  });

  it("Sondertilgung ist kein Zins, senkt aber den Folgezins", () => {
    const rep = [{ amountCents: 5_000_000, date: "2021-06-15" }];
    const y21 = loanInterestForYear(p, 2021, rep);
    expect(y21.extraRepaymentCents).toBe(5_000_000);
    expect(y21.interestCents + y21.principalCents).toBe(12 * 100_000);
    expect(loanInterestForYear(p, 2022, rep).interestCents).toBeLessThan(
      loanInterestForYear(p, 2022).interestCents,
    );
  });

  it("Jahre vor Kreditbeginn = 0, ohne Kreditdaten nicht konfiguriert", () => {
    expect(loanInterestForYear(p, 2019).interestCents).toBe(0);
    expect(loanInterestForYear({ id: "x" } as Property, 2021).configured).toBe(false);
  });

  it("Rate deckt nach Tilgung nicht mehr als die Restschuld (Ende)", () => {
    const small = { ...p, loanOriginalCents: 300_000 } as Property;
    const total = [2020, 2021].reduce((s, y) => {
      const r = loanInterestForYear(small, y);
      return s + r.principalCents;
    }, 0);
    expect(total).toBe(300_000);
  });
});

// Rate 400 EUR < Monatszins 500 EUR (200.000 EUR x 3 % / 12).
describe("Rate kleiner als Monatszins", () => {
  afterEach(() => vi.useRealTimers());
  const low = { ...p, loanMonthlyPaymentCents: 40_000 } as Property;

  it("gezahlter Zins = Rate, keine Tilgung (Zins + Tilgung = gezahlte Raten)", () => {
    const y = loanInterestForYear(low, 2021);
    expect(y.interestCents).toBe(12 * 40_000); // 4.800 EUR, nicht 6.000 EUR
    expect(y.principalCents).toBe(0);
    expect(y.interestCents + y.principalCents).toBe(12 * 40_000);
  });

  it("ungedeckter Zins erhoeht die Restschuld (negative Tilgung)", () => {
    // Monat 1: Zins 50.000, gezahlt 40.000 -> Restschuld 20.010.000
    // Monat 2: Zins round(20.010.000 x 0,0025) = 50.025 -> Restschuld 20.020.025
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2020, 2, 15));
    const s = computeLoan(low);
    expect(s.remainingCents).toBe(20_020_025);
    expect(s.monthlyInterestCents).toBe(40_000);
    expect(s.monthlyPrincipalCents).toBe(0);
    expect(s.payable).toBe(false);
  });
});
