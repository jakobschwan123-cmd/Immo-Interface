# Steuer-Interface – Aufgabenplan

Branch: `feature/steuer-interface`. Quelle: Backlog „Jahresabschluss & Steuererklärung"
in `docs/projektplan_immobilien_management.md`. Ziel: prüffähige Vorbereitung für
Steuerberater bzw. ELSTER (Anlage V) – **kein Steuerberater-Ersatz**.

Regeln für alle Aufgaben: Geld nur in Cent (`src/lib/money.ts`), Rechenlogik als reine
Funktionen in `src/lib/` (UI nur anzeigen), danach `npx tsc --noEmit` + `npm run lint`.
Alle neuen Geldwerte in der UI bekommen die Klasse `privacy-blur`.

## Ausgangslage (Code)
- `computeEuer(properties, transactions, year)` in `src/lib/euer.ts` nimmt bereits eine
  **Liste** von Immobilien → objektbezogen = Liste mit einem Element (kaum Backend-Aufwand).
- AfA wird dort als **voller Jahresbetrag** angesetzt (`calculateKpis(p).annualAfaCents`).
- Zinsen kommen nur aus Buchungen der Kategorie `Finanzierungszins`; `computeLoan` in
  `src/lib/loan.ts` kennt den Plan, wird aber in der EÜR nicht genutzt.
- Kategorien (`TRANSACTION_CATEGORIES`) sind grob; Anlage V braucht feinere Zuordnung.
- CSV-Export nur für die EÜR (`euerToCsv`, `downloadTextFile` in `src/lib/csv.ts`).

## Aufgaben (Reihenfolge = empfohlene Abarbeitung)

### A1 – Objektbezogene EÜR  `S`
Umschaltung im Jahresabschluss: Gesamt (Rechtsträger) ↔ Einzelobjekt.
- Backend: `computeEuer` unverändert nutzen; Helfer, der Buchungen/Objekt filtert und eine
  Pro-Objekt-Liste liefert (`computeEuerPerProperty`).
- UI: `src/app/jahresabschluss/page.tsx` – Auswahl Objekt, CSV/Druck übernehmen den Filter.
- Fertig, wenn: Summe der Einzelobjekte = Gesamt-EÜR des Rechtsträgers.

### A2 – Zeitanteilige AfA im Kaufjahr  `M`
§ 7 Abs. 4 EStG: monatsgenau ab Anschaffungsmonat (Kauf Juli = 6/12).
- Backend: `afaForYear(property, year)` in `src/lib/finance.ts` (aus `purchaseDate`;
  Jahre vor Kauf = 0, Folgejahre voll). `computeEuer` nutzt sie statt `annualAfaCents`.
- Klären: Monat des Kaufs zählt voll (üblich) – gegen Steuerberater bestätigen.
- Fertig, wenn: Kauf 15.07. → 6/12; Kauf im Vorjahr → 12/12; Kauf im Folgejahr → 0.

### A3 – Schuldzinsen vs. Tilgung  `M`
Nur Zinsen sind Werbungskosten.
- Backend: `loanInterestForYear(property, year)` in `src/lib/loan.ts` aus dem
  Annuitätenplan (`computeLoan`, Sondertilgungen berücksichtigen).
- EÜR: berechneten Zins neben gebuchten `Finanzierungszins` zeigen (Plausibilitäts-
  hinweis bei Abweichung), nicht stillschweigend doppelt zählen.
- Klären: Soll der berechnete Wert die Buchung ersetzen oder nur vergleichen?
- Fertig, wenn: Zins+Tilgung = Jahresrate; Sondertilgung erscheint nicht als Ausgabe.

### A4 – Buchungsjournal-Export  `S`
Lückenloser Einzelnachweis pro Jahr: Datum, Immobilie, Kategorie, Text, Einnahme/Ausgabe, Betrag.
- Backend: `journalRows(properties, transactions, year)` + `journalToCsv` in `csv.ts`
  (Sortierung nach Datum, Sondertilgungen kennzeichnen oder ausschließen).
- UI: Button neben dem EÜR-Export; Druckansicht (`print:`-Styles wie EÜR).
- Fertig, wenn: Summe der Journalzeilen = EÜR-Einnahmen/-Ausgaben (ohne AfA/Sondertilgung).

### A5 – Kategorien für Anlage V verfeinern  `M` (Voraussetzung für A6)
Aktuelle Kategorien lassen sich nicht sauber auf Anlage-V-Zeilen abbilden (z. B. Umlagen,
Erhaltungsaufwand, Verwaltung getrennt von Sonstigem).
- Backend: `TRANSACTION_CATEGORIES` in `src/lib/types.ts` erweitern **abwärtskompatibel**
  (bestehende Buchungen in Firestore behalten ihre Kategorie).
- UI: `transaction-dialog.tsx` Auswahl anpassen.

### A6 – ELSTER-Zeilen-Mapping Anlage V  `L`
Gegenüberstellung App-Zahl ↔ Zeile der Anlage V.
- Backend: `src/lib/anlage-v.ts` mit Mapping Kategorie/AfA/Zins → Zeile; pro Objekt und Jahr.
- **Zeilennummern vorher gegen das amtliche Formular des jeweiligen Jahres prüfen** – die im
  Projektplan genannten Zeilen ändern sich mit den Formularjahrgängen und sind nicht verifiziert.
- UI: neue Ansicht/Tab im Jahresabschluss + kurzer Leitfaden (Text), Export als CSV.
- Fertig, wenn: jede EÜR-Position ist genau einer Zeile zugeordnet oder als „nicht zugeordnet" markiert.

## Abhängigkeiten
`A1` → unabhängig · `A2`, `A3` → wirken in die EÜR, danach `A4` gegenprüfen ·
`A5` → vor `A6` · Größe: S ≈ ½ Tag, M ≈ 1 Tag, L ≈ mehrere Tage.

## Offene Fragen an den Steuerberater
1. AfA im Kaufjahr: ab Kaufmonat voll oder tagesgenau?
2. Berechneten Darlehenszins verwenden oder nur gebuchte Zinsen?
3. Sollen Ferienobjekte und Eigennutzung in der Anlage V gesondert behandelt werden?
