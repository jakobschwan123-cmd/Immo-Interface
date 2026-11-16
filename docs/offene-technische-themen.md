# Offene technische Themen

Dinge, die geklärt oder entschieden werden müssen, bevor oder während sie umgesetzt werden.
Features stehen in [`backlog.md`](backlog.md). Erledigtes wird hier gestrichen.

## Entschieden
- **Gemini/Belegauslesung:** wird gebaut (Entscheidung 10/2026, vorher „vorerst nicht"). Serverseitig,
  Bestätigung durch den Nutzer, Blaze-Plan nötig. Details: [`backlog.md`](backlog.md) Phase 3.
- **Onboarding/Nutzer:** final. Ein Google-Account, genutzt von zwei PCs (Claude Code und Antigravity).
- **Rechtsträger:** aktuell keine Immobilie in einer GmbH, GmbH bleibt außerhalb des Scopes.
- **AfA ohne gültiges Kaufdatum (11/2026):** EÜR setzt 0 an und warnt im Jahresabschluss
  (`afaMissingDate`). Dashboard-KPI rechnet weiter bewusst mit voller Jahres-AfA.
- **Backup (11/2026):** Firestore-Export statt eigenem Skript. Einrichtung offen, braucht Blaze.
- **Beleg-Links (11/2026):** `getDownloadURL` bleibt (dauerhafte Token-URL, öffnet ohne Login). Neu
  bewerten, falls mehr als ein Account die App nutzt – dann `getBlob` + Object-URL (braucht CORS).
- **Dev-Whitelist (11/2026):** keine Build-Warnung, die Rules greifen ohnehin.

## Absicherung & Betrieb
- **Firestore-Rules versionieren/deployen:** `firebase.json` + Firebase CLI statt `firestore.rules`
  manuell in der Console pflegen. Rules liegen dann im Repo, Änderungen sind nachvollziehbar und
  per `firebase deploy --only firestore:rules` reproduzierbar (ggf. lokal testbar mit Emulator).
  Angelegt: `firebase.json` + `.firebaserc` (Projekt `immo-interface`), Anleitung in `docs/deployment.md`.
  Offen: `firebase login` und erster `firebase deploy --only firestore:rules` durch Jakob.
- **Backup einrichten:** wöchentlicher Firestore-Export (passt zum Erfassungsrhythmus), sobald
  Blaze aktiv ist (braucht Cloud Storage Bucket).

## Qualität
- **Tests:** ✅ Vitest eingerichtet (`npm test`). Abgedeckt: `money.ts`, EÜR-Summen (A1),
  Journal (A4), `loan.ts`, `finance.ts`. Neue Rechenlogik (A2, A3) immer mit Test.

## Edge-Cases aus der Durchsicht 11/2026 (zu entscheiden)
- **Eigennutzung in der EÜR:** `computeEuer` setzt AfA und Ausgaben auch für Objekte mit
  `rentalType` „Eigennutzung" an und mindert so das Ergebnis des Rechtsträgers. Laut ELSTER-Anleitung
  sind Aufwendungen für eigengenutzte Wohnungen keine Werbungskosten. Vorschlag: aus EÜR/Anlage V
  ausschließen und Hinweis zeigen.
- **Immobilie löschen:** `deleteProperty` löscht nur das Objekt; Buchungen und Belege bleiben unsichtbar
  in Firestore/Storage liegen. Entscheiden: mitlöschen (mit Anzahl in der Rückfrage) oder Löschen
  sperren, solange Buchungen existieren.
- **Erstattung an Mieter (Anlage V Z. 21, negativ):** nicht buchbar – Beträge sind immer positiv, eine
  Ausgabe landet im falschen Bereich.
- **Hausgeld/Erhaltungsrücklage:** Rücklage ist erst bei Verwendung abziehbar; die App kann den Anteil
  nicht abtrennen (wer das Hausgeld komplett bucht, zieht zu viel ab).
- **Grundsteuer/Versicherung:** Anlage V kennt nur „umgelegt" (Z. 73–75) und „nicht umgelegt" (Z. 76–78).
  Die App ordnet beide Kategorien fest „nicht umgelegt" zu; bei Dauervermietung werden sie meist umgelegt.
- **Kein Verkaufsdatum:** AfA läuft nach einem Verkauf weiter.
- **Buchungen nicht bearbeitbar:** Korrektur nur per Löschen und Neuanlegen (Beleg wird mitgelöscht).
- **Kredit:** unvollständige Kreditdaten und Sondertilgungen vor Kreditbeginn bzw. ohne Kredit werden
  stillschweigend ignoriert.

## Produkt-Idee: Vermarktung als App/Website
Idee: Programm über die Familie hinaus anbieten (erster Interessent: Bekannter mit mehreren Immobilien).
Voraussetzungen, bevor das realistisch wird: Mandantenfähigkeit (heute ein gemeinsames
Haushaltsmodell mit fester Allowlist), Datenschutz/DSGVO (Finanzdaten, AV-Vertrag, Impressum),
Haftung/„kein Steuerberater-Ersatz", Abrechnung. Schritt 1 wäre ein kleiner Pilot mit 1–2 Bekannten.

## Fachliche Fragen an den Steuerberater
1. **AfA im Kaufjahr:** Kaufmonat voll oder tagesgenau? (A2, üblich: Kaufmonat voll)
2. **Darlehenszins:** Berechneten Zins verwenden oder nur gebuchte Zinsen? (A3)
3. **Ferienobjekte und Eigennutzung:** In der Anlage V gesondert behandeln? (A6, ggf. Anlage V-FeWo)
4. **Grundsteuer, Versicherung, Verwaltung:** umgelegte oder nicht umgelegte Kosten? (A5-Entwurf: nicht umgelegt)
5. **Hausgeld (WEG):** Aufteilung umgelegt / nicht umgelegt / Erhaltungsrücklage (Rücklage erst bei Verwendung abziehbar)?
6. **Erhaltungsaufwand:** sofort abziehen oder nach § 82b EStDV verteilen? Anschaffungsnahe Herstellungskosten (15 %-Grenze)?
7. **Miete von Angehörigen:** gesondert auszuweisen – unterscheidet die App bisher nicht.

### Unterlagen besorgen (vor A2, A3, A5, A6)
- [ ] Letzte Anlage V bzw. EÜR je Objekt, ideal ein Kaufjahr und ein Folgejahr
- [ ] Bank-Jahresbescheinigung der Darlehen (Zins vs. Tilgung)
- [ ] Zuordnung des Steuerberaters je Ausgabenart zu Anlage-V-Zeilen (für A5/A6)
- [ ] Zeilennummern des passenden Formularjahrgangs
- [ ] Vor dem Ablegen schwärzen (Namen, Adressen, Steuer-ID, IBAN); nicht ins Git-Repo, nur lokal
      in einem ignorierten Ordner (z. B. `local/` in `.gitignore`)
