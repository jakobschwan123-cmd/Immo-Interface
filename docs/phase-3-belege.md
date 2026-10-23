# Phase 3: Belege (Storage + Gemini)

Infrastruktur steht auf `feature/belege`: Upload nach Firebase Storage, serverseitiges Auslesen per
Gemini, eigenständige Komponente. Noch **nicht** im Buchungsdialog eingebaut.

## Bausteine
- `storage.rules` – `receipts/{propertyId}/{fileName}`: nur eingeloggt + `email_verified` + E-Mail in
  Firestore `config/allowlist`. Nur JPG/PNG/WebP/HEIC/HEIF/PDF, max. 10 MB, nur anlegen/lesen/löschen
  (kein Überschreiben). Alles andere verboten.
- `src/lib/receipts.ts` – Typ `ReceiptExtraction` (Betrag in Cent, Datum `YYYY-MM-DD`), Normalisierung
  der Gemini-Antwort (Test: `receipts.test.ts`), Limits/Dateitypen.
- `src/app/api/receipts/parse/route.ts` – `POST`, Body = Datei, `Authorization: Bearer <ID-Token>`.
  Prüft Token (Signatur/Projekt/Ablauf/`email_verified`) + `ALLOWED_EMAILS`, ruft Gemini auf, speichert
  und loggt keine Belegdaten. Max. 4 MB (Vercel-Limit 4,5 MB); große Fotos verkleinert der Client nur
  für die Auslesung.
- `src/components/receipt-upload.tsx` – Foto/Datei wählen → Upload → Auslesen →
  `onExtracted(extraction, storagePath)`. Schreibt nichts in Firestore.

## Einrichtung (Jakob, einmalig)
1. **Blaze-Plan** im Firebase-Projekt aktivieren (Storage braucht ihn). Budget-Alarm setzen.
2. **Storage anlegen:** Firebase Console → Storage → „Jetzt starten“, Region möglichst `europe-west3`
   (Frankfurt). `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` in `.env.local`/Vercel prüfen.
3. **Regeln deployen:** `firebase deploy --only storage`. Beim ersten Mal fragt die CLI, ob Storage
   Firestore lesen darf (Cross-Service-Rule für die Allowlist) → bestätigen.
4. **Gemini-API-Key:** in Google AI Studio erstellen – **in einem Projekt mit aktiver Abrechnung**.
   Achtung: Im unbezahlten Tier darf Google Eingaben zur Produktverbesserung nutzen (auch menschliche
   Prüfung). Für echte Belege nur den bezahlten Tier nutzen bzw. die aktuellen Gemini-API-
   Nutzungsbedingungen vorher prüfen. Key nach Möglichkeit auf die Generative Language API beschränken.
5. **Env-Vars in Vercel** (Production + Preview), **ohne** `NEXT_PUBLIC_`:
   - `GEMINI_API_KEY` – der Key
   - `ALLOWED_EMAILS` – dieselben Adressen wie in `config/allowlist` (Komma-getrennt)
   - `GEMINI_MODEL` – optional, Standard `gemini-3.8-flash`
   Danach neu deployen. Lokal dieselben Werte in `.env.local`.

## Offene Punkte für die Integration
- `ReceiptUpload` in `transaction-dialog.tsx` einbauen: Vorschlag in Felder übernehmen (Betrag via
  `centsToEuroInput`, Datum, Verwendungszweck); `categorySuggestion` nur übernehmen, wenn es eine
  gültige `TransactionCategory` ist. Speichern bleibt Klick des Nutzers.
- `Transaction` um z. B. `receiptPath?: string` erweitern und `storagePath` mitspeichern.
- Bricht der Nutzer ab, bleibt die Datei liegen → beim Abbrechen `deleteObject` aufrufen oder
  verwaiste Belege später aufräumen.
- Anzeige/Download eines Belegs (`getDownloadURL` oder `getBlob`) an der Buchung.
- Optional: einfaches Rate-Limit der API (aktuell nur durch Allowlist geschützt).
- Token-Widerruf wird nicht geprüft (ID-Token lebt max. 1 h) – bewusst, dafür kein Service-Account nötig.
