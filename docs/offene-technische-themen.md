# Offene technische Themen

Dinge, die geklärt oder entschieden werden müssen, bevor oder während sie umgesetzt werden.
Features stehen in [`backlog.md`](backlog.md). Erledigtes wird hier gestrichen.

## Entscheidungen
- **Gemini & Datenschutz:** Echte Finanzdaten/Belege an Gemini schicken – ja/nein, und mit welchen
  Schutzmaßnahmen? Gemini-Key ist noch nicht eingerichtet, Aufrufe nur serverseitig. Blockiert Phase 3.
- **Firebase Blaze-Plan:** Storage (Belege, Bilder) braucht Blaze. Kosten/Budget-Limit festlegen.

## Absicherung & Betrieb
- **Firestore-Rules versionieren/deployen:** `firebase.json` + Firebase CLI (ggf. Emulator) statt
  `firestore.rules` manuell in der Console pflegen.
- **Dev-Whitelist:** Leere `NEXT_PUBLIC_ALLOWED_EMAILS` lässt jede Google-Adresse rein (nur UX,
  Rules greifen trotzdem). In Produktion nie leer lassen, ggf. Warnung/Build-Check ergänzen.
- **Backup:** Automatischer Firestore-Export, Turnus und Ablageort festlegen.

## Qualität
- **Tests:** Es gibt keinen Test-Runner. Reine Rechenlogik (`money.ts`, `loan.ts`, `finance.ts`,
  `euer.ts`) sollte mit Vitest getestet werden, da Fehler hier echte Finanzzahlen verfälschen.
  Konkret prüfen: Summe der Einzelobjekt-EÜRs = Gesamt-EÜR (A1); Journalsummen = EÜR ohne AfA (A4).
- **Journal vs. EÜR bei Alt-Kategorien:** Die EÜR zählt nur Kategorien aus
  `TRANSACTION_CATEGORIES`, das Journal zeigt alle Buchungen. Bei Buchungen mit unbekannter
  Kategorie weichen die Summen ab. Mit echten Daten prüfen (relevant für A5).

## Fachliche Fragen an den Steuerberater
1. **AfA im Kaufjahr:** Kaufmonat voll oder tagesgenau? (A2, üblich: Kaufmonat voll)
2. **Darlehenszins:** Berechneten Zins verwenden oder nur gebuchte Zinsen? (A3)
3. **Ferienobjekte und Eigennutzung:** In der Anlage V gesondert behandeln? (A6)

### Unterlagen besorgen (vor A2, A3, A5, A6)
- [ ] Letzte Anlage V bzw. EÜR je Objekt, ideal ein Kaufjahr und ein Folgejahr
- [ ] Bank-Jahresbescheinigung der Darlehen (Zins vs. Tilgung)
- [ ] Zuordnung des Steuerberaters je Ausgabenart zu Anlage-V-Zeilen (für A5/A6)
- [ ] Zeilennummern des passenden Formularjahrgangs
- [ ] Vor dem Ablegen schwärzen (Namen, Adressen, Steuer-ID, IBAN); nicht ins Git-Repo, nur lokal
      in einem ignorierten Ordner (z. B. `local/` in `.gitignore`)

## Doku
- **README.md aktualisieren:** erwähnt Gemini „serverseitig" und Storage, beides noch nicht gebaut.
