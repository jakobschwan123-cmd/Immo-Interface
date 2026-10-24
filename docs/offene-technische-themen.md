# Offene technische Themen

Dinge, die geklärt oder entschieden werden müssen, bevor oder während sie umgesetzt werden.
Features stehen in [`backlog.md`](backlog.md). Erledigtes wird hier gestrichen.

## Entschieden
- **Gemini/Belegauslesung:** wird gebaut (Entscheidung 10/2026, vorher „vorerst nicht"). Serverseitig,
  Bestätigung durch den Nutzer, Blaze-Plan nötig. Details: [`backlog.md`](backlog.md) Phase 3.
- **Onboarding/Nutzer:** final. Ein Google-Account, genutzt von zwei PCs (Claude Code und Antigravity).
- **Rechtsträger:** aktuell keine Immobilie in einer GmbH, GmbH bleibt außerhalb des Scopes.

## Absicherung & Betrieb
- **Firestore-Rules versionieren/deployen:** `firebase.json` + Firebase CLI statt `firestore.rules`
  manuell in der Console pflegen. Rules liegen dann im Repo, Änderungen sind nachvollziehbar und
  per `firebase deploy --only firestore:rules` reproduzierbar (ggf. lokal testbar mit Emulator).
  Angelegt: `firebase.json` + `.firebaserc` (Projekt `immo-interface`), Anleitung in `docs/deployment.md`.
  Offen: `firebase login` und erster `firebase deploy --only firestore:rules` durch Jakob.
- **Backup:** Automatischer Firestore-Export; wöchentlich passt zum Erfassungsrhythmus.
  Firestore-Export braucht Blaze (Cloud Storage Bucket) → Alternative: eigenes Skript, das
  wöchentlich JSON lokal sichert. Entscheiden.
- **Dev-Whitelist:** Nur ein Account nutzt die App, Rules greifen ohnehin → niedrige Priorität.
  Optional Build-Warnung bei leerer `NEXT_PUBLIC_ALLOWED_EMAILS`.

## Qualität
- **Tests:** ✅ Vitest eingerichtet (`npm test`). Abgedeckt: `money.ts`, EÜR-Summen (A1),
  Journal (A4), `loan.ts`, `finance.ts`. Neue Rechenlogik (A2, A3) immer mit Test.
- **AfA ohne gültiges Kaufdatum:** `afaForYear` setzt dann die volle AfA an – auch für Jahre
  vor dem Kauf (auch bei `"2025-7-15"` ohne führende Null). Entscheiden: 0 + Warnung oder
  Kaufdatum zur Pflicht machen. Dashboard-KPI rechnet bewusst immer mit voller Jahres-AfA.

- **Beleg-Links (`getDownloadURL`):** liefern eine dauerhafte URL mit Token – öffnet den Beleg ohne Login,
  landet im Browserverlauf. Entscheiden: so lassen oder `getBlob` + Object-URL (braucht CORS am Bucket).

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
