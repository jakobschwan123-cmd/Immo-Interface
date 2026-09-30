import { describe, expect, it } from "vitest";
import { loanInterestForYear } from "./loan";
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
