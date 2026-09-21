# Immo-Interface

Web-App zur Verwaltung von Immobilien und deren Finanzen (privates Familienprojekt).
Übersicht über alle Kennzahlen, KI-gestützte Beleg-Erfassung und ein exportfähiger
Jahresabschluss (EÜR) als Vorbereitung für den Steuerberater.

> ⚠️ Diese App verwaltet **echte, private Finanzdaten** und ist eine Vorbereitung für
> den Steuerberater – **kein Steuerberater-Ersatz**.

## Tech-Stack

- **Next.js (App Router)** + React + TypeScript
- **Tailwind CSS** + shadcn/ui
- **Firebase**: Firestore (DB), Auth (Google Sign-In), Storage (Belege)
- **Google Gemini API** (Beleg-Auslesung, nur serverseitig)
- **Deployment**: Vercel (via GitHub)

## Setup (lokal)

```bash
# 1. Abhängigkeiten installieren
npm install

# 2. Umgebungsvariablen anlegen
cp .env.example .env.local
# -> danach echte Firebase-/Gemini-Werte in .env.local eintragen

# 3. Entwicklungsserver starten
npm run dev
```

Die App läuft dann auf http://localhost:3000

## Wichtige Grundregeln

1. Zugriff nur für erlaubte E-Mails (Whitelist), erzwungen über Firestore Security Rules.
2. Geldbeträge immer als Ganzzahl in **Cent** speichern (keine Fließkommazahlen).
3. Gemini-Key & andere Secrets nie im Browser – nur serverseitig (`.env.local`).

## Projektplan

Der detaillierte Plan mit Phasen und Zeitplan liegt in
[`docs/projektplan_immobilien_management.md`](docs/projektplan_immobilien_management.md).
