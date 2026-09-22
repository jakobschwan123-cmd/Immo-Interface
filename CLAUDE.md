@AGENTS.md

# Immo-Interface — Projektkontext für Claude

Web-App zur Verwaltung der Immobilien & Finanzen der Familie (privat).
**Echte Finanzdaten → Sicherheit hat Vorrang.** Vorbereitung für den Steuerberater,
kein Steuerberater-Ersatz. Antworten/Kommentare auf **Deutsch**.

## Tech-Stack
Next.js (App Router) + TypeScript · Tailwind + shadcn/ui (Style „base-nova", `@base-ui/react`) ·
Firebase (Firestore, Auth Google, Storage geplant) · Deployment: Vercel (Auto-Deploy bei `git push` auf `main`).

## Wichtige Konventionen (unbedingt beachten)
- **Geld immer als Ganzzahl in Cent.** Umrechnung nur über `src/lib/money.ts`
  (`formatEuro`, `euroInputToCents`, `centsToEuroInput`). Round-Trip ist verlustfrei.
- **Sicherheit:** Zugriff nur für Allowlist. Verbindlich über `firestore.rules`
  (`config/allowlist` Dokument mit `emails`), Client-Whitelist `NEXT_PUBLIC_ALLOWED_EMAILS` ist nur UX.
- **Firestore:** `ignoreUndefinedProperties` aktiv → leere optionale Felder sind ok.
- **Nach jeder sinnvollen Änderung:** `npx tsc --noEmit` + `npm run lint`, dann committen & pushen (Vercel deployt automatisch).
- `.env.local` bleibt lokal; Vercel-Env-Vars separat pflegen.

## Datenmodell (Firestore, gemeinsames Haushaltsmodell)
- `entities` — Rechtsträger (Name, Rechtsform). Immobilien gruppieren danach; EÜR läuft pro Rechtsträger.
- `properties` — Immobilie: Stammdaten, Kaufpreis/Grund/Gebäude (AfA), Vermietungstyp
  (Dauer/Ferien/Eigennutzung), m²/Einheiten, Miete (`unitRents` = Miete je Einheit),
  Kostenpositionen (Strom/Wasser/Internet/Versicherung/Grundsteuer/Hausgeld+%/Sonstiges),
  Kredit (Darlehenssumme, Zins, Rate, Beginn → Restschuld berechnet in `src/lib/loan.ts`).
- `transactions` — Buchungen (income/expense/**repayment**=Sondertilgung). Sondertilgung senkt Restschuld, zählt NICHT in EÜR.
- Kennzahlen: `src/lib/finance.ts` (`effectiveMonthlyRentCents`, `effectiveMonthlyCostsCents` je Vermietungsart, `calculateKpis`, `sumKpis`).
- EÜR: `src/lib/euer.ts`; CSV/Export: `src/lib/csv.ts`.

## Stand der Phasen (Sept 2026)
- **0 Setup, 1 Login, 2/2b Datenmodell+Dashboard+Buchungen, 4 Jahresabschluss (EÜR): ✅ fertig & live.**
- **3 Belege/Gemini + Storage/Bilder: ⏸️ geparkt** (Datenschutz- & Blaze-Entscheidung offen; Gemini-Key noch nicht eingerichtet).
- **5 Polish & Rollout: 🟡 teilweise** — Deployment auf Vercel ✅; offen: Mobile-Optimierung, Fehler/Edge-Cases, Backup (Firestore-Export), Onboarding der Eltern.

Gebaut u.a.: Rechtsträger-Gruppierung, Detailseite pro Immobilie, Diagramme, Anlegen/Bearbeiten/Löschen,
Kredit als Annuitätendarlehen + Sondertilgungen, vermietungsabhängige Kostenaufteilung, Miete je Einheit,
Dashboard-Kennzahlen (Gesamtwert #1, Einkommen/Jahr #2 mit Area-Chart), EÜR + CSV/Druck,
Privacy-Modus (Diskretionsmodus via CSS-Blur und localStorage).

## Backlog / Wünsche für später
- **Jahresabschluss & Steuererklärung (Prio 1 für ELSTER & Steuerberater):**
  - Objektbezogene EÜR (Pflicht für Anlage V: Umschaltung Gesamt/Einzelobjekt)
  - Buchungsjournal-Export (lückenloser Einzelnachweis aller Belege als CSV/Druck)
  - Zeitanteilige AfA im Kaufjahr (monatsgenau nach § 7 Abs. 4 EStG)
  - Darlehenszinsen vs. Tilgung (Schuldzinsen-Berechnung/Übernahme in EÜR)
  - ELSTER-Leitfaden / Zeilen-Mapping für Anlage V
- **Immobilien-Wertberechnung:** Ertragswertverfahren (deterministisch, KEIN AI nötig) +
  m²-Schnellschätzer via Gemini (braucht API-Key). Details im Projektplan.
- **Privacy-Modus:** ✅ Umgesetzt & live.
- **Bilder pro Immobilie** (braucht Storage/Blaze, mit Phase 3).
- Kosmetik: Restschuld-Spalte „–" statt „0,00 €" bei kreditfreien Objekten.

## Doku
`docs/projektplan_immobilien_management.md` (Plan + Backlog), `docs/phase-0-setup.md`,
`docs/deployment.md`, `docs/master_prompt_ki_assistent.txt`.
