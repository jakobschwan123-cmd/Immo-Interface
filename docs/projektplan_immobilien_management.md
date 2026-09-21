# Projektplan: Immobilien-Management (Web-App)

> **Kontext:** Private Web-App zur Verwaltung der Immobilien & Finanzen meiner Eltern.
> Es geht um **echte, private Finanzdaten** → Sicherheit hat oberste Priorität.
> Die App ist eine **Vorbereitung für den Steuerberater, kein Steuerberater-Ersatz.**

## 🏗️ Architektur & Tech-Stack
*   **Frontend / UI:** React (mit Next.js App Router), TypeScript
*   **Styling:** Tailwind CSS, shadcn/ui
*   **Backend / Datenbank:** Firebase (Cloud Firestore)
*   **Datei-Speicher:** Firebase Storage (für hochgeladene Belege/Rechnungen als PDF/Bild)
*   **Authentifizierung:** Firebase Authentication (Google Sign-In) **+ feste E-Mail-Whitelist**
*   **KI-Integration:** Google Gemini API (Beleg-Auslesung) — **nur serverseitig aufgerufen**
*   **Hosting / Deployment:** Vercel (via GitHub)

---

## 🔒 Grundregeln (gelten in jeder Phase)

1.  **Zugriff nur für erlaubte E-Mails.** Google-Login allein reicht nicht — nur eine feste
    Whitelist (ich + meine Eltern) darf rein. Erzwungen über Firestore Security Rules,
    nicht nur im Frontend.
2.  **Firestore Security Rules sind Pflicht.** Zugriff wird serverseitig geprüft, nie nur im Client.
3.  **Geldbeträge immer als Ganzzahl in Cent speichern** (z. B. `120050` = 1.200,50 €).
    Niemals Fließkommazahlen für Geld → sonst Rundungsfehler.
4.  **Gemini API-Key niemals im Browser.** Alle KI-Aufrufe laufen über eine
    Next.js Server Action / Route Handler. Key liegt in `.env` (serverseitig).
5.  **Früh & oft deployen.** Schon ab Phase 1 auf Vercel — nicht erst am Ende.
6.  **Am Ende jeder Phase gibt es etwas Lauffähiges & Deploytes.**

---

## 📊 Datenmodell (Firestore)

Alle Daten sind pro Nutzer/Haushalt isoliert (user-scoped).

*   **`properties`** (Immobilien-Stammdaten)
    *   Kaufpreis (Cent), **Aufteilung Grund / Gebäude** (wichtig für AfA!)
    *   Rechtsform (`Privat` | `GbR` | `GmbH`), Adresse, Kaufdatum
*   **`transactions`** (Buchungen: Einnahmen & Ausgaben)
    *   Betrag (Cent), Datum, Verwendungszweck
    *   **Kategorie** (feste Liste, z. B. Mieteinnahme, Instandhaltung, Grundsteuer, Versicherung, …)
    *   Verknüpfung zur Immobilie + optional zum Beleg
*   **`documents`** (Metadaten zu hochgeladenen Belegen)
    *   Storage-Pfad, Original-Dateiname, Upload-Datum, verknüpfte Transaktion
    *   Von Gemini extrahierte Rohdaten (zur Nachvollziehbarkeit)
*   **`entities`** (Rechtsträger) — *geplant, siehe Backlog*
    *   Name (z. B. „Schwan GmbH", „Familie Schwan GbR", „Papa privat"), Rechtsform
    *   Jede Immobilie gehört genau einem Rechtsträger (`properties.entityId`)

> **Hinweis zur Rechtsform:** Für **Privat / GbR** ist die EÜR das passende Werkzeug.
> Eine **GmbH** bilanziert eigentlich (keine EÜR) → für den Start Scope auf **Privat/GbR**
> beschränken, GmbH ggf. später.

---

## 🧭 Backlog / Für später

*   **Privacy-Modus:** Umschalter, der alle Geldbeträge/Werte unkenntlich macht
    (z. B. verblurrt oder als „••••"), damit man den Bildschirm zeigen kann, ohne
    Zahlen preiszugeben. Idealerweise pro Gerät gemerkt (localStorage).

*   **Rechtsträger-Gruppierung (wichtig für den Jahresabschluss):**
    Immobilien gehören verschiedenen **Rechtsträgern** — es kann mehrere gleicher Art
    geben (z. B. zwei GbRs, eine GmbH, Privatpersonen). Ziel: Immobilien einem
    Rechtsträger zuordnen und im Dashboard **pro Rechtsträger gruppieren + Zwischensummen**
    bilden. Der **Jahresabschluss (EÜR/Bilanz) läuft pro Rechtsträger**, nicht pro Immobilie.
    → Umsetzung: neue Collection `entities`, Feld `entityId` an `properties`, Gruppierung
    im Dashboard, Filter/Summen pro Rechtsträger. Ersetzt langfristig das einfache
    Feld `legalForm`.

*   **Zusätzliche Stammdaten-Felder:**
    *   Wohnfläche in **m²**
    *   **Anzahl Wohnungen/Einheiten** pro Objekt

*   **Vermietungstyp (wichtig fürs Ferienhaus):**
    Nicht jede Immobilie hat eine feste Monatsmiete. Feld `rentalType`:
    `Dauervermietung` | `Ferienvermietung` | `Eigennutzung/leer`.
    Bei **Ferienvermietung** (z. B. Ferienhaus der Eltern, nur zeitweise vermietet)
    kommen die Einnahmen aus **einzelnen Buchungen** (Phase 2b), nicht aus einer
    Monats-Kaltmiete. Die Kennzahlen (Rendite etc.) müssen das berücksichtigen.

*   **Bilder zu Immobilien:** Foto-Upload pro Objekt → braucht Firebase Storage,
    daher zusammen mit Phase 3 (Belege) umsetzen.

*   **Immobilien-Wertberechnung (Marktwert automatisch):**
    Zwei Verfahren:
    1. **Schnell-Überschlag:** `Marktwert ≈ Wohnfläche × Ø-m²-Preis der Stadt`.
       Der Ø-m²-Preis ist der Teil, der **aktuelle Marktdaten** braucht → hier käme
       **Gemini (AI)** ins Spiel (braucht API-Key). Grob/ungenau.
    2. **Ertragswertverfahren (deterministisch, KEIN AI nötig):**
       - Bodenwert = Grundstücksgröße × Bodenrichtwert (aus BORIS-NRW)
       - Reiner Gebäudeertrag = Jahreskaltmiete − Bewirtschaftungskosten (ca. 15–30 %,
         Ferien 35–50 %) − (Bodenwert × Liegenschaftszins ~5,5–6 %)
       - Gebäudeertragswert = Reiner Gebäudeertrag × Vervielfältiger (amtl. Tabelle,
         abhängig von Restnutzungsdauer + Liegenschaftszins)
       - **Gesamtwert = Bodenwert + Gebäudeertragswert**
       → Kann jederzeit ohne Kosten gebaut werden; Nutzer gibt Bodenrichtwert,
         Grundstücksgröße, Liegenschaftszins, Vervielfältiger, Bewirtschaftungs-%
         ein. Jahreskaltmiete haben wir bereits.

---

## 📅 Meilensteine & Phasen

### Phase 0: Vorbereitung (Fundament auf Papier) — *NEU*
*   Accounts anlegen: Firebase-Projekt, Vercel, Google Gemini API-Key.
*   Datenmodell (`properties`, `transactions`, `documents`) auf Papier / in Notizen skizzieren.
*   Sicherheitskonzept festhalten: welche E-Mails dürfen rein?
*   `.env`-Struktur planen (welche Keys werden gebraucht, was ist geheim?).
*   **Ziel:** Alle Zugänge da, Datenmodell klar, bevor die erste Zeile Code entsteht.

### Phase 1: Das Fundament (Setup & Login)
*   Next.js Projekt initialisieren (inkl. Tailwind & TypeScript).
*   shadcn/ui initialisieren.
*   GitHub Repository anlegen und mit Vercel verknüpfen (**früh deployen**).
*   Firebase-Anbindung einrichten.
*   Google Login implementieren — **mit E-Mail-Whitelist** (nur erlaubte Nutzer).
*   **Ziel:** Leere, deployte Webseite mit sicherem, beschränktem Login.

### Phase 2: Datenstruktur & Core Features
*   Firestore-Struktur (`properties`, `transactions`, `documents`) anlegen.
*   **Firestore Security Rules schreiben & testen** (user-scoped, Whitelist).
*   Übersichts-Dashboard für alle Immobilien bauen.
*   Formulare für Stammdaten (Kaufpreis, Grund/Gebäude-Aufteilung, Rechtsform, etc.).
*   Berechnung & Anzeige von: Monatskosten, Mieteinnahmen, **AfA (2 % linear auf Gebäudeanteil)**, Rendite, Marktwert.
*   **Ziel:** Händische Verwaltung und Anzeige der Immobilien-Finanzen ist möglich.

### Phase 3: Zahlungs-Flow & Gemini-Magie
*   Upload-Komponente für Rechnungen/Kontoauszüge (Bild/PDF) → **Firebase Storage**.
*   Google Gemini API **serverseitig** anbinden (Prompt für: Betrag, Datum, Zweck, Kategorie-Vorschlag).
*   Bestätigungs-UI bauen (Nutzer prüft & korrigiert KI-Vorschlag vor dem Speichern).
*   **Ziel:** Halbautomatisierte Erfassung von Buchungen.

### Phase 4: Jahresabschluss & Export
*   Logik zur Aggregation der Jahresdaten pro Immobilie (nach Kategorien).
*   Ansicht für die Einnahmen-Überschuss-Rechnung (EÜR) erstellen.
*   Export-Funktion (CSV/PDF) für den Steuerberater implementieren.
*   **Ziel:** Exportfähiger Jahresabschluss ist generierbar.

### Phase 5: Polish & Rollout
*   Mobile Optimierung (UI/UX Check für Smartphones).
*   Fehlerbehandlung und Edge-Cases abfangen.
*   **Backup-Konzept** (automatischer Firestore-Export).
*   Offizielles Onboarding der Eltern.
*   **Ziel:** Fertiges, stabiles Produkt im produktiven Einsatz.

---

## 🗓️ Zeitplan (~10 Std/Woche, Start 21.09.2026)

| Phase | Aufwand | Zeitraum |
|---|---|---|
| **Phase 0** – Vorbereitung | ~5 h | KW 39 (22.–28. Sep) |
| **Phase 1** – Fundament & Login | ~12 h | KW 40–41 (29. Sep – 12. Okt) |
| **Phase 2** – Datenstruktur & Core | ~35 h | KW 42–45 (13. Okt – 9. Nov) |
| **Phase 3** – Upload & Gemini | ~22 h | KW 46–48 (10.–30. Nov) |
| **Phase 4** – EÜR & Export | ~18 h | KW 49–50 (1.–14. Dez) |
| **Phase 5** – Polish & Rollout | ~15 h | KW 51–52 (15.–28. Dez) |

**→ Realistisches Fertig-Datum: ~Ende Dezember 2026.**
Phase 2 ist mit Abstand die größte — dort am meisten Zeit einplanen.
