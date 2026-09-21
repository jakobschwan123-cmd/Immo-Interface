// Annuitätendarlehen: berechnet aus Darlehenssumme, Zinssatz, Rate und
// Kreditbeginn die AKTUELLE Restschuld, den Zins-/Tilgungsanteil der Rate und
// das voraussichtliche Ende (wann die Restschuld 0 erreicht).
//
// Prinzip pro Monat: Zins = Restschuld × Monatszins; Tilgung = Rate − Zins;
// neue Restschuld = alte Restschuld − Tilgung.

import type { Property } from "./types";

// Eine Sondertilgung: Betrag (Cent) an einem Datum.
export type Repayment = { amountCents: number; date: string };

export type LoanState = {
  configured: boolean; // sind alle Kreditdaten gesetzt?
  remainingCents: number; // aktuelle Restschuld
  monthlyInterestCents: number; // Zinsanteil der aktuellen Rate
  monthlyPrincipalCents: number; // Tilgungsanteil der aktuellen Rate
  payoffMonth: string | null; // voraussichtlich abbezahlt (YYYY-MM) oder null
  monthsRemaining: number | null; // Restlaufzeit in Monaten oder null
  payable: boolean; // false = Rate deckt nicht mal die Zinsen
};

const NOT_CONFIGURED: LoanState = {
  configured: false,
  remainingCents: 0,
  monthlyInterestCents: 0,
  monthlyPrincipalCents: 0,
  payoffMonth: null,
  monthsRemaining: null,
  payable: false,
};

export function computeLoan(
  p: Property,
  repayments: Repayment[] = [],
): LoanState {
  if (
    p.loanOriginalCents == null ||
    p.loanMonthlyPaymentCents == null ||
    p.loanInterestRatePercent == null ||
    !p.loanStartDate
  ) {
    return NOT_CONFIGURED;
  }

  const start = new Date(p.loanStartDate);
  if (Number.isNaN(start.getTime())) return NOT_CONFIGURED;

  const monthlyRate = p.loanInterestRatePercent / 100 / 12;
  const payment = p.loanMonthlyPaymentCents;
  const now = new Date();

  // Sondertilgungen je Kalendermonat "YYYY-MM" aufsummieren.
  const repayByMonth = new Map<string, number>();
  for (const r of repayments) {
    const key = (r.date ?? "").slice(0, 7); // "YYYY-MM"
    if (key) repayByMonth.set(key, (repayByMonth.get(key) ?? 0) + r.amountCents);
  }

  // Wie viele volle Monate sind seit Kreditbeginn vergangen?
  let monthsElapsed =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  if (monthsElapsed < 0) monthsElapsed = 0;

  // Tilgungsverlauf bis heute simulieren (inkl. Sondertilgungen).
  let balance = p.loanOriginalCents;
  for (let m = 0; m <= monthsElapsed && balance > 0; m++) {
    if (m > 0) {
      // regulaere Rate: Zins + Tilgung
      const interest = Math.round(balance * monthlyRate);
      const principal = payment - interest;
      if (principal > 0) {
        balance -= principal;
        if (balance < 0) balance = 0;
      }
    }
    // Sondertilgungen dieses Kalendermonats abziehen.
    const d = new Date(start.getFullYear(), start.getMonth() + m, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const extra = repayByMonth.get(key);
    if (extra) {
      balance -= extra;
      if (balance < 0) balance = 0;
    }
  }
  const remaining = Math.max(0, balance);

  // Zins-/Tilgungsanteil der aktuellen Rate.
  const monthlyInterest = remaining > 0 ? Math.round(remaining * monthlyRate) : 0;
  const monthlyPrincipal =
    remaining > 0 ? Math.max(0, payment - monthlyInterest) : 0;

  // Restlaufzeit ab heute bis Restschuld 0.
  let monthsRemaining: number | null;
  let payable = true;
  if (remaining <= 0) {
    monthsRemaining = 0;
  } else if (payment <= monthlyInterest) {
    payable = false; // Rate deckt nicht mal die Zinsen
    monthsRemaining = null;
  } else {
    let b = remaining;
    let months = 0;
    const CAP = 1200; // Sicherheitslimit (100 Jahre)
    while (b > 0 && months < CAP) {
      const interest = Math.round(b * monthlyRate);
      const principal = payment - interest;
      if (principal <= 0) break;
      b -= principal;
      months++;
      if (b < 0) b = 0;
    }
    monthsRemaining = months >= CAP ? null : months;
    if (monthsRemaining == null) payable = false;
  }

  // Enddatum (Monatsgenau).
  let payoffMonth: string | null = null;
  if (monthsRemaining != null) {
    const d = new Date(now.getFullYear(), now.getMonth() + monthsRemaining, 1);
    payoffMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  return {
    configured: true,
    remainingCents: remaining,
    monthlyInterestCents: monthlyInterest,
    monthlyPrincipalCents: monthlyPrincipal,
    payoffMonth,
    monthsRemaining,
    payable,
  };
}
