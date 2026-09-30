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

### A1 – Objektbezogene EÜR  `S`  ✅ erledigt
Umschaltung im Jahresabschluss: Gesamt (Rechtsträger) ↔ Einzelobjekt.
- Backend: `computeEuer` unverändert nutzen; Helfer, der Buchungen/Objekt filtert und eine
  Pro-Objekt-Liste liefert (`computeEuerPerProperty`).
- UI: `src/app/jahresabschluss/page.tsx` – Auswahl Objekt, CSV/Druck übernehmen den Filter.
- Fertig, wenn: Summe der Einzelobjekte = Gesamt-EÜR des Rechtsträgers.

### A2 – Zeitanteilige AfA im Kaufjahr  `M`  ✅ umgesetzt (Annahme: Kaufmonat voll, Steuerberater bestätigt noch)
§ 7 Abs. 4 EStG: monatsgenau ab Anschaffungsmonat (Kauf Juli = 6/12).
- Backend: `afaForYear(property, year)` in `src/lib/finance.ts` (aus `purchaseDate`;
  Jahre vor Kauf = 0, Folgejahre voll). `computeEuer` nutzt sie statt `annualAfaCents`.
- Klären: Monat des Kaufs zählt voll (üblich) – gegen Steuerberater bestätigen.
- Fertig, wenn: Kauf 15.07. → 6/12; Kauf im Vorjahr → 12/12; Kauf im Folgejahr → 0.

### A3 – Schuldzinsen vs. Tilgung  `M`  🟡 Teil 1 fertig (`loanInterestForYear`, Vergleichshinweis in der EÜR); Entscheidung ersetzen/vergleichen offen
Nur Zinsen sind Werbungskosten.
- Backend: `loanInterestForYear(property, year)` in `src/lib/loan.ts` aus dem
  Annuitätenplan (`computeLoan`, Sondertilgungen berücksichtigen).
- EÜR: berechneten Zins neben gebuchten `Finanzierungszins` zeigen (Plausibilitäts-
  hinweis bei Abweichung), nicht stillschweigend doppelt zählen.
- Klären: Soll der berechnete Wert die Buchung ersetzen oder nur vergleichen?
- Fertig, wenn: Zins+Tilgung = Jahresrate; Sondertilgung erscheint nicht als Ausgabe.

### A4 – Buchungsjournal-Export  `S`  ✅ erledigt
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

## Delegation an Agents (Claude entscheidet selbst, kein manuelles Aufrufen nötig)
Ziel: Tokens sparen. Vor jeder Aufgabe bewertet Claude kurz und wählt die günstigste
passende Ausführung. Ein Agent startet kalt (Kontext neu aufbauen) – lohnt sich nur,
wenn die Aufgabe groß genug oder wirklich parallel ist.

**Bewertung (4 Kriterien):**
1. **Größe** – S/M/L aus dem Plan.
2. **Klarheit** – keine offenen Steuerberater-Fragen, Definition „Fertig, wenn" eindeutig.
3. **Isolation** – berührt andere Dateien als parallel laufende Aufgaben (Konflikt-Hotspots:
   `euer.ts`, `jahresabschluss/page.tsx`, `types.ts`).
4. **Risiko** – verändert Rechenlogik echter Finanzzahlen (dann Tests + Review Pflicht).

**Entscheidung:**
| Ergebnis der Bewertung | Ausführung |
|---|---|
| S, klar, wenig Kontext nötig | **Direkt im Hauptchat**, kein Agent |
| M/L, klar, isoliert, parallel zu anderem Task | **Agent im eigenen Worktree/Branch** (`feature/<kurzname>`) |
| Rechenlogik (A2, A3, Tests) | Agent mit stärkerem Modell; Ergebnis vor dem Merge mit `/code-review` prüfen |
| Rein mechanisch (README, Doku, Lint-Fixes) | günstiges Modell (haiku) oder direkt |
| Offene Fragen / Abhängigkeit ungeklärt (A6, A5 vor Klärung) | **Nicht starten**, Rückfrage an Jakob |
| Ändert `types.ts` oder dieselbe Stelle in `euer.ts` wie ein laufender Agent | **Nacheinander**, nicht parallel |

**Regeln für jeden Agent:** eigener Branch, nur die Dateien seiner Aufgabe anfassen,
`npx tsc --noEmit` + `npm run lint` vor dem Commit, **nicht selbst auf `main` pushen** –
Merge entscheidet Jakob. Agent-Ergebnis kurz zusammenfassen (Dateien, Tests, offene Punkte).

**Tokens sparen:** parallel höchstens 2–3 Agents; Agents bekommen einen selbsttragenden
Prompt (Aufgabe + Dateien + „Fertig, wenn" aus diesem Plan), damit sie nichts neu erkunden.

## Offene Fragen & Unterlagen
Siehe [`offene-technische-themen.md`](offene-technische-themen.md) (Abschnitt „Fachliche Fragen an den Steuerberater").
Status der Aufgaben: [`backlog.md`](backlog.md).
