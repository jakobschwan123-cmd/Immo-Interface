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
| A2 | Zeitanteilige AfA im Kaufjahr (§ 7 Abs. 4 EStG, monatsgenau) | offen – wartet auf Klärung AfA-Kaufmonat |
| A3 | Schuldzinsen vs. Tilgung (berechneter Zins aus `computeLoan`) | offen – wartet auf Klärung Zins ersetzen/vergleichen |
| A5 | Kategorien für Anlage V verfeinern (abwärtskompatibel) | offen – braucht Zuordnung vom Steuerberater |
| A6 | ELSTER-Zeilen-Mapping Anlage V | offen – braucht A5 und verifizierte Formularzeilen |

Zeilennummern der Anlage V ändern sich mit dem Formularjahrgang und sind nicht verifiziert.

## Immobilien-Wertberechnung
- **Ertragswertverfahren** (deterministisch, KEIN AI): Bodenwert = Grundstücksgröße × Bodenrichtwert
  (BORIS-NRW); Reiner Gebäudeertrag = Jahreskaltmiete − Bewirtschaftungskosten −
  (Bodenwert × Liegenschaftszins); Gebäudeertragswert = Reiner Gebäudeertrag × Vervielfältiger;
  Gesamtwert = Bodenwert + Gebäudeertragswert.
- **m²-Schnellschätzer** via Gemini: Marktwert ≈ Wohnfläche × Ø-m²-Preis der Stadt (braucht API-Key).

## ⏸️ Phase 3: Belege & Gemini (geparkt)
- Beleg-Upload (Firebase Storage) und Gemini-Auslesung (Betrag, Datum, Zweck, Kategorievorschlag),
  serverseitig, mit Bestätigungs-UI. Blockiert durch Datenschutz-/Blaze-Entscheidung, siehe
  offene technische Themen.
- **Bilder pro Immobilie** (braucht Storage, zusammen mit Belegen).

## Phase 5: Polish & Rollout (teilweise)
- Mobile-Optimierung
- Fehlerbehandlung und Edge-Cases
- Backup (Firestore-Export)
- Onboarding der Eltern

## Kosmetik
- Restschuld-Spalte: „–" statt „0,00 €" bei kreditfreien Objekten.

## Erledigt
- Privacy-Modus (Augen-Icon im Header, CSS-Blur, localStorage) ✅
