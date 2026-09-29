@AGENTS.md

# Immo-Interface

Web-App zur Verwaltung der Immobilien & Finanzen der Familie (privat). Dient als README für
Jakob und Claude: Überblick, Konventionen, Wegweiser. Details stehen in `docs/`.
**Echte Finanzdaten → Sicherheit hat Vorrang.** Vorbereitung für den Steuerberater,
kein Steuerberater-Ersatz. Antworten/Kommentare auf **Deutsch**.

## Tech-Stack
Next.js (App Router) + TypeScript · Tailwind + shadcn/ui (Style „base-nova", `@base-ui/react`) ·
Firebase (Firestore, Auth Google, Storage geplant) · Deployment: Vercel (Auto-Deploy bei `git push` auf `main`).

## Konventionen (unbedingt beachten)
- **Geld immer als Ganzzahl in Cent.** Umrechnung nur über `src/lib/money.ts`
  (`formatEuro`, `euroInputToCents`, `centsToEuroInput`).
- **Rechenlogik als reine Funktionen in `src/lib/`**, UI zeigt nur an. Neue Geldwerte in der UI
  bekommen die Klasse `privacy-blur`.
- **Tests:** Vitest (`npm test`, `*.test.ts` neben dem Code). Neue Rechenlogik in `src/lib/` bekommt einen Test.
- **Sicherheit:** Zugriff nur für Allowlist. Verbindlich über `firestore.rules`
  (`config/allowlist` mit `emails`), Client-Whitelist `NEXT_PUBLIC_ALLOWED_EMAILS` ist nur UX.
- **Firestore:** `ignoreUndefinedProperties` aktiv → leere optionale Felder sind ok.
- **Nach jeder sinnvollen Änderung:** `npx tsc --noEmit` + `npm run lint` + `npm test`, dann committen & pushen
  (Vercel deployt `main` automatisch; Feature-Branches nicht).
- `.env.local` bleibt lokal; Vercel-Env-Vars separat pflegen.

## Datenmodell (Firestore, gemeinsames Haushaltsmodell)
- `entities` — Rechtsträger. Immobilien gruppieren danach; EÜR läuft pro Rechtsträger und pro Objekt.
- `properties` — Stammdaten, Kaufpreis/Grund/Gebäude (AfA), Vermietungstyp (Dauer/Ferien/Eigennutzung),
  m²/Einheiten, Miete (`unitRents`), Kostenpositionen, Kredit (Restschuld berechnet in `src/lib/loan.ts`).
- `transactions` — income/expense/**repayment** (Sondertilgung: senkt Restschuld, zählt NICHT in EÜR).
- Logik: `src/lib/finance.ts` (Kennzahlen), `euer.ts` (EÜR, Journal), `csv.ts` (Export), `loan.ts`.

## Stand
- ✅ Phase 0–2b (Setup, Login, Datenmodell, Dashboard, Buchungen), Phase 4 (EÜR), Privacy-Modus, Deployment.
- ✅ Steuer-Interface A1 (objektbezogene EÜR) und A4 (Buchungsjournal) auf `feature/steuer-interface`.
- ⏸️ Phase 3 (Belege/Gemini/Storage) geparkt. 🟡 Phase 5 (Polish/Rollout) teilweise.

## Wegweiser: Doku
- [`docs/backlog.md`](docs/backlog.md) — was noch gebaut werden soll, inkl. Status A1–A6
- [`docs/offene-technische-themen.md`](docs/offene-technische-themen.md) — Entscheidungen, Absicherung, Tests, Fragen an den Steuerberater
- [`docs/steuer-interface-aufgaben.md`](docs/steuer-interface-aufgaben.md) — Aufgabenplan Steuer-Interface (A1–A6)
- [`docs/projektplan_immobilien_management.md`](docs/projektplan_immobilien_management.md) — Ursprungsplan, Phasen, Zeitplan
- [`docs/phase-0-setup.md`](docs/phase-0-setup.md), [`docs/deployment.md`](docs/deployment.md), [`docs/master_prompt_ki_assistent.txt`](docs/master_prompt_ki_assistent.txt)

Neue Wünsche → `backlog.md`; Unklarheiten/Entscheidungen → `offene-technische-themen.md`. Nicht hier eintragen.
