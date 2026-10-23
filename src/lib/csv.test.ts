import { describe, expect, it } from "vitest";
import { cell, journalToCsv } from "./csv";
import type { JournalRow } from "./euer";

describe("CSV: Formel-Injection", () => {
  it("schützt Formeln", () => expect(cell("=SUMME(1)")).toBe("'=SUMME(1)"));
  it("schützt + @ - Text, Tab und CR", () => {
    expect(cell("+1+1")).toBe("'+1+1");
    expect(cell("@cmd")).toBe("'@cmd");
    expect(cell("-Reparatur")).toBe("'-Reparatur");
    expect(cell("\tx")).toBe("'\tx");
    expect(cell("\rx")).toBe("'\rx");
  });
  it("lässt Beträge unverändert (auch negative)", () => {
    expect(cell("-123,45")).toBe("-123,45");
    expect(cell("1200,50")).toBe("1200,50");
  });
  it("lässt normalen Text unverändert, escapt weiter Semikolon/Anführungszeichen", () => {
    expect(cell("Reparatur")).toBe("Reparatur");
    expect(cell('a;"b"')).toBe('"a;""b"""');
    expect(cell("=a;b")).toBe(`"'=a;b"`);
  });
  it("Journal: Freitext geschützt, Betrag nicht", () => {
    const row = {
      id: "1",
      date: "2025-01-02",
      propertyId: "a",
      propertyName: "Haus",
      category: "Instandhaltung",
      description: "=HYPERLINK(1)",
      type: "expense",
      amountCents: 12345,
    } as JournalRow;
    const line = journalToCsv([row], 2025, "T").split("\n")[3];
    expect(line).toBe("02.01.2025;Haus;Instandhaltung;'=HYPERLINK(1);Ausgabe;-123,45");
  });
});
