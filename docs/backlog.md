# Backlog

Alles, was gewünscht, aber noch nicht gebaut ist. Technische Klärungen stehen in
[`offene-technische-themen.md`](offene-technische-themen.md), die Umsetzung des
Steuer-Interfaces im Detail in [`steuer-interface-aufgaben.md`](steuer-interface-aufgaben.md).

Legende: 🔥 hohe Priorität · ⏸️ geparkt/blockiert · ✅ erledigt

## 🔥 Jahresabschluss & Steuererklärung (Anlage V / Steuerberater)
Ziel: Steuererklärung (Anlage V) selbst bei ELSTER abgeben können bzw. dem Steuerberater
einen vollständigen, prüffähigen Vorab-Abschluss übergeben. Branch `feature/steuer-interface`.

| # | Punkt | Status |
|---|---|---|
| A1 | Objektbezogene EÜR (Umschaltung Gesamt/Einzelobjekt) | ✅ |
| A4 | Buchungsjournal (Anzeige, Druck, CSV) | ✅ |
| A2 | Zeitanteilige AfA im Kaufjahr (§ 7 Abs. 4 EStG, monatsgenau) | ✅ mit Annahme „Kaufmonat voll"; Bestätigung Steuerberater offen |
| A3 | Schuldzinsen vs. Tilgung (berechneter Zins aus dem Annuitätenplan) | 🟡 Berechnung + Vergleichsanzeige fertig; offen: ersetzt der berechnete Zins die Buchungen? |
| A5 | Kategorien für Anlage V verfeinern (abwärtskompatibel) | offen – braucht Zuordnung vom Steuerberater |
| A6 | ELSTER-Zeilen-Mapping Anlage V | offen – braucht A5 und verifizierte Formularzeilen |

Zeilennummern der Anlage V ändern sich mit dem Formularjahrgang und sind nicht verifiziert.

## Immobilien-Wertberechnung
- ✅ **Ertragswertverfahren** (`src/lib/valuation.ts`, Anzeige auf der Objektseite).
  🔄 Mietausfallwagnis (2 %) wird ergänzt.

## 🔄 Phase 3: Belege & Gemini (in Arbeit)
Entscheidung (10/2026): wird gebaut – Upload nach Firebase Storage + Auslesung per Gemini, serverseitig,
mit Bestätigung durch den Nutzer. Braucht Blaze-Plan und einen Gemini-Key in einem Projekt mit Abrechnung
(unbezahltes Tier darf Eingaben zur Produktverbesserung nutzen).
- 🔄 Infrastruktur: Storage-Rules, API-Route mit Token- und Allowlist-Prüfung, Upload-Komponente
- Integration in den Buchungsdialog (nach A5, damit Gemini die neuen Kategorien vorschlägt)
- Einrichtung durch Jakob: Blaze, Storage anlegen, Key, Env-Vars in Vercel

## Phase 5: Polish & Rollout (teilweise)
- ✅ Mobile-Optimierung (🔄 Objektseite/Objekt-Dialog laufen noch)
- Fehlerbehandlung und Edge-Cases
- Backup – Entscheidung offen: eigenes Skript (JSON lokal) oder Firestore-Export (mit Blaze jetzt möglich)

## Später / Ideen
- **m²-Schnellschätzer** via Gemini: Marktwert ≈ Wohnfläche × Ø-m²-Preis der Stadt. Wird leicht, sobald
  der Gemini-Endpoint aus Phase 3 steht.
- **Bilder pro Immobilie** – nutzt denselben Storage wie die Belege.
- **Ertragswert: weitere Pauschalen** nach Anlage 3 ImmoWertV (Verwaltung, Instandhaltung), falls nicht
  schon im Hausgeld enthalten.
- **Onboarding der Eltern.**
- **Produkt / Vermarktung:** App/Website auch für andere anbieten. Vorbedingungen in
  [`offene-technische-themen.md`](offene-technische-themen.md) (Abschnitt „Produkt-Idee").

## Erledigt
- Privacy-Modus (Augen-Icon im Header, CSS-Blur, localStorage) ✅
- Restschuld-Spalte: „–" statt „0,00 €" bei kreditfreien Objekten ✅
