// A6 – Zuordnung der EÜR-Positionen eines Objekts zu den Bereichen der Anlage V.
//
// ENTWURF – vom Steuerberater zu bestaetigen. Die Zuordnung Kategorie -> Bereich ist
// eine Annahme; die Zuordnung des Steuerberaters liegt noch nicht vor. Kein
// Steuerberater-Ersatz.
//
// Quelle Bereiche/Feldbezeichnungen und Zeilennummern (Formularjahrgang 2025):
//   ELSTER, „Anleitung zur Einkommensteuererklärung 2025", Abschnitt „Anlage V"
//   https://www.elster.de/eportal/helpGlobal?themaGlobal=help_est_ufa_10_2025
//   (abgerufen 24.10.2026). Zeilen gelten NUR fuer 2025 – andere Jahrgaenge
//   haben andere Zeilen, dort wird `zeile` nicht angezeigt.
//
// Grundlage sind die EÜR-Zeilen (computeEuer): jede Position landet in genau einem
// Bereich oder in „Nicht zugeordnet". Sondertilgungen sind in der EÜR nicht
// enthalten und erscheinen daher auch hier nicht.

import { AFA_LABEL, computeEuer, type EuerLine } from "./euer";
import type { Property, Transaction } from "./types";

export const ANLAGE_V_QUELLE =
  "ELSTER, Anleitung zur Einkommensteuererklärung 2025, Abschnitt Anlage V";
export const ANLAGE_V_ZEILEN_JAHR = 2025;
// Summenzeilen 2025 (gleiche Quelle).
export const ANLAGE_V_SUMMEN_ZEILEN = { einnahmen: "32", werbungskosten: "83", ueberschuss: "85" };

type BereichDef = {
  label: string; // Feldbezeichnung laut Anleitung 2025
  zeile2025?: string; // verifiziert in der Quelle oben
  hinweis?: string;
};

// Reihenfolge = Reihenfolge im Formular.
const BEREICHE = {
  mieteinnahmen: {
    label: "Mieteinnahmen (ohne Umlagen)",
    zeile2025: "13–19",
    hinweis: "Wohnungen Z. 13–15, andere Räume Z. 16–18, an Angehörige vermietet Z. 19.",
  },
  umlagen: {
    label: "Einnahmen aus umgelegten Neben-/Betriebskosten (Umlagen)",
    zeile2025: "20–24",
    hinweis: "Laufende Umlagen Z. 20, Nachzahlung/Erstattung aus der Abrechnung Z. 21.",
  },
  sonstigeEinnahmen: {
    label: "Sonstige Einnahmen",
    zeile2025: "25–28",
    hinweis: "Z. B. einbehaltene Mietkaution (Z. 25).",
  },
  zuschuesse: { label: "Zuschüsse", zeile2025: "29–31" },
  afa: {
    label: "Abschreibung für Gebäude (§ 7 Abs. 4 bis 5a EStG)",
    zeile2025: "33–35",
  },
  schuldzinsen: {
    label: "Schuldzinsen",
    zeile2025: "46–48",
    hinweis:
      "Gebuchte Zinsen (Kategorie Finanzierungszins). Berechneter Zins nur zum Vergleich – offene Frage an den Steuerberater.",
  },
  geldbeschaffung: { label: "Geldbeschaffungskosten", zeile2025: "49–51" },
  erhaltung: {
    label: "Erhaltungsaufwendungen",
    zeile2025: "55–72",
    hinweis:
      "Als sofort abziehbar angesetzt. Verteilung (§ 82b EStDV) und anschaffungsnahe Herstellungskosten (> 15 % in 3 Jahren nach Kauf) mit Steuerberater prüfen.",
  },
  umgelegt: { label: "Umgelegte Kosten", zeile2025: "73–75" },
  nichtUmgelegt: {
    label: "Nicht umgelegte Kosten",
    zeile2025: "76–78",
    hinweis:
      "Grundsteuer, Versicherung und Verwaltung sind hier angesetzt. Werden sie auf Mieter umgelegt, gehören sie zu „Umgelegte Kosten“.",
  },
  sonstigeKosten: { label: "Sonstige Kosten", zeile2025: "80–82" },
} satisfies Record<string, BereichDef>;

export type BereichKey = keyof typeof BEREICHE;

// ENTWURF: Kategorie -> Bereich, getrennt nach Einnahme/Ausgabe.
// Kategorien sind bereits normalisiert (veraltete -> neue, siehe normalizeCategory).
const INCOME_MAP: Record<string, BereichKey> = {
  Mieteinnahme: "mieteinnahmen",
  "Nebenkosten-Vorauszahlung": "umlagen",
  Zuschuss: "zuschuesse",
  Sonstiges: "sonstigeEinnahmen",
};

const EXPENSE_MAP: Record<string, BereichKey> = {
  [AFA_LABEL]: "afa",
  Finanzierungszins: "schuldzinsen",
  Geldbeschaffungskosten: "geldbeschaffung",
  Erhaltungsaufwand: "erhaltung",
  "Betriebskosten (umgelegt)": "umgelegt",
  "Betriebskosten (nicht umgelegt)": "nichtUmgelegt",
  Grundsteuer: "nichtUmgelegt",
  Versicherung: "nichtUmgelegt",
  Verwaltung: "nichtUmgelegt",
  Sonstiges: "sonstigeKosten",
};

// Bereich fuer eine (normalisierte) Kategorie; null = nicht zugeordnet.
export function anlageVBereich(
  type: "income" | "expense",
  category: string,
): { key: BereichKey; label: string } | null {
  const key = (type === "income" ? INCOME_MAP : EXPENSE_MAP)[category];
  return key ? { key, label: BEREICHE[key].label } : null;
}

export type AnlageVRow = {
  art: "Einnahmen" | "Werbungskosten";
  bereich: string; // Feldbezeichnung oder „Nicht zugeordnet"
  zugeordnet: boolean;
  zeile?: string; // nur fuer den verifizierten Jahrgang (2025)
  amountCents: number;
  positionen: string[]; // zugrunde liegende EÜR-Positionen
  hinweis?: string;
};

export type AnlageV = {
  year: number;
  property: Property;
  rows: AnlageVRow[];
  einnahmenCents: number;
  werbungskostenCents: number;
  ueberschussCents: number;
  hinweise: string[]; // objektbezogene Hinweise (z.B. Ferienvermietung)
};

const NICHT_ZUGEORDNET = "Nicht zugeordnet";

function mapLines(
  lines: EuerLine[],
  type: "income" | "expense",
  year: number,
): AnlageVRow[] {
  const art = type === "income" ? "Einnahmen" : "Werbungskosten";
  const byKey = new Map<string, AnlageVRow>();
  for (const line of lines) {
    const b = anlageVBereich(type, line.label);
    const key = b?.key ?? NICHT_ZUGEORDNET;
    let row = byKey.get(key);
    if (!row) {
      const def: BereichDef | undefined = b ? BEREICHE[b.key] : undefined;
      row = {
        art,
        bereich: def?.label ?? NICHT_ZUGEORDNET,
        zugeordnet: !!def,
        zeile: year === ANLAGE_V_ZEILEN_JAHR ? def?.zeile2025 : undefined,
        amountCents: 0,
        positionen: [],
        hinweis: def
          ? def.hinweis
          : "Kategorie ohne Anlage-V-Bereich – mit Steuerberater zuordnen.",
      };
      byKey.set(key, row);
    }
    row.amountCents += line.amountCents;
    row.positionen.push(line.label);
  }
  // Formular-Reihenfolge, „Nicht zugeordnet" am Ende.
  const order = Object.keys(BEREICHE);
  const pos = (k: string) => (k === NICHT_ZUGEORDNET ? order.length : order.indexOf(k));
  return [...byKey].sort(([a], [b]) => pos(a) - pos(b)).map(([, r]) => r);
}

// Anlage V (Entwurf) fuer EIN Objekt und Jahr – Anlage V gilt je Grundstueck.
export function computeAnlageV(
  property: Property,
  transactions: Transaction[],
  year: number,
): AnlageV {
  const euer = computeEuer([property], transactions, year);
  const hinweise: string[] = [];
  if (property.legalForm === "GmbH") {
    hinweise.push(
      "GmbH: Keine Anlage V – Einkünfte sind gewerblich (Bilanz/Körperschaftsteuer). Übersicht nur zur Information.",
    );
  }
  if (property.rentalType === "Ferienvermietung") {
    hinweise.push(
      "Ferienvermietung: zusätzlich Anlage V-FeWo (Tage Selbstnutzung/Vermietung/Leerstand). Gesonderte Behandlung mit Steuerberater klären.",
    );
  }
  if (property.rentalType === "Eigennutzung") {
    hinweise.push(
      "Eigennutzung: Für ausschließlich selbst genutzte Gebäude ist keine Anlage V auszufüllen. Gesonderte Behandlung mit Steuerberater klären.",
    );
  }
  if (year !== ANLAGE_V_ZEILEN_JAHR) {
    hinweise.push(
      `Zeilennummern nur für ${ANLAGE_V_ZEILEN_JAHR} geprüft – für ${year} bitte im amtlichen Formular nachsehen.`,
    );
  }
  return {
    year,
    property,
    rows: [...mapLines(euer.income, "income", year), ...mapLines(euer.expenses, "expense", year)],
    einnahmenCents: euer.incomeTotalCents,
    werbungskostenCents: euer.expenseTotalCents,
    ueberschussCents: euer.surplusCents,
    hinweise,
  };
}
