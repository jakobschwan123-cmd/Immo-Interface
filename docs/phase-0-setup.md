# Phase 0 – Setup-Anleitung (Accounts & Zugänge)

Diese Schritte machst **du** manuell. Am Ende trägst du die Werte in `.env.local` ein.
**Wichtig:** Keys/Secrets niemals in den Chat oder ins Git-Repo – nur in `.env.local`.

---

## 1. Firebase-Projekt anlegen

1. Gehe auf https://console.firebase.google.com und melde dich mit deinem Google-Account an.
2. Klick **„Projekt erstellen"**.
3. Projektname: z. B. `immo-interface`.
4. **Google Analytics: deaktivieren** (brauchen wir nicht) → „Projekt erstellen".
5. Warten, bis das Projekt bereit ist → „Weiter".

## 2. Web-App im Firebase-Projekt registrieren

1. In der Projekt-Übersicht auf das **Web-Icon `</>`** klicken (oder Zahnrad → Projekteinstellungen → „Meine Apps").
2. App-Spitzname: z. B. `Immo-Interface Web`.
3. **Firebase Hosting NICHT** ankreuzen (wir nutzen Vercel) → „App registrieren".
4. Firebase zeigt jetzt ein `firebaseConfig`-Objekt. **Diese 6 Werte brauchst du** für `.env.local`:
   - `apiKey`            → `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `authDomain`        → `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `projectId`         → `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `storageBucket`     → `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `messagingSenderId` → `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `appId`             → `NEXT_PUBLIC_FIREBASE_APP_ID`
   - (Du findest sie jederzeit wieder unter Zahnrad → Projekteinstellungen → „Meine Apps".)

> Hinweis: Diese Werte sind halb-öffentlich (landen im Browser) – das ist bei Firebase
> normal und ok. Die eigentliche Sicherheit kommt über die Security Rules (Phase 2).

## 3. Authentication aktivieren (Google-Login)

1. Linkes Menü: **Build → Authentication** → „Los geht's".
2. Tab **„Sign-in method"** → in der Liste **Google** auswählen.
3. **Aktivieren** einschalten → Support-E-Mail auswählen → **Speichern**.

## 4. Firestore-Datenbank aktivieren

1. **Build → Firestore Database** → „Datenbank erstellen".
2. Standort: **`europe-west3` (Frankfurt)** wählen.
   ⚠️ Der Standort ist später **nicht änderbar** – gleich richtig wählen (EU wegen DSGVO/Nähe).
3. Regeln-Modus: **„Im Produktionsmodus starten"** (nicht Testmodus!).
   → Damit ist erstmal alles gesperrt. Die passenden Rules schreiben wir in Phase 2.

## 5. Storage aktivieren (für Beleg-Uploads)

1. **Build → Storage** → „Los geht's".
2. Ebenfalls **Produktionsmodus** → Standort wird übernommen/gleich wählen.

## 6. Gemini API-Key holen

1. Gehe auf https://aistudio.google.com/apikey
2. **„Create API key"** → am einfachsten im selben Google-Projekt (`immo-interface`).
3. Key kopieren → kommt in `.env.local` als `GEMINI_API_KEY` (server-only, **kein** `NEXT_PUBLIC_`!).

## 7. Vercel-Account

1. Gehe auf https://vercel.com → **„Sign up"** → **mit GitHub anmelden**.
2. (Das eigentliche Deployment richten wir später gemeinsam ein – Account reicht fürs Erste.)

## 8. Erlaubte E-Mails festlegen

Notiere die Google-E-Mail-Adressen, die Zugriff bekommen sollen (du + deine Eltern).
Kommen später in `.env.local` als `ALLOWED_EMAILS` und in die Security Rules.

---

## Abschluss: `.env.local` befüllen

Im Projektordner:

```bash
cp .env.example .env.local
```

Dann `.env.local` öffnen und alle Werte aus den Schritten oben eintragen. Beispiel:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=immo-interface.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=immo-interface
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=immo-interface.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abc123
GEMINI_API_KEY=...
ALLOWED_EMAILS=deine@gmail.com,mutter@gmail.com,vater@gmail.com
```

> `.env.local` wird durch `.gitignore` **nie** committet – deine Keys bleiben lokal. ✅

## Checkliste

- [x] 1. Firebase-Projekt erstellt
- [x] 2. Web-App registriert (6 Config-Werte in .env.local)
- [x] 3. Authentication → Google aktiviert (Login getestet ✅)
- [x] 4. Firestore aktiviert (Standardversion, europe-west3, Produktionsmodus)
- [ ] 5. Storage aktiviert  → **auf Phase 3 verschoben** (braucht Blaze-Tarif)
- [ ] 6. Gemini API-Key erstellt  → wird erst in Phase 3 gebraucht
- [ ] 7. Vercel-Account (mit GitHub)  → für Deployment
- [x] 8. Erlaubte E-Mails notiert (Whitelist gesetzt)
- [x] 9. `.env.local` angelegt und befüllt (Firebase + Whitelist)
