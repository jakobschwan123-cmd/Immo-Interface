# Deployment auf Vercel (damit die App online erreichbar ist)

Ziel: Die App läuft unter einer echten URL, sodass Eltern sie im Browser
(Desktop + Handy) nutzen können.

## 1. Vercel-Account anlegen
1. https://vercel.com → **Sign Up** → **Continue with GitHub** → autorisieren.

## 2. Projekt importieren
1. Vercel-Dashboard → **Add New… → Project**.
2. Das GitHub-Repo **Immo-Interface** auswählen → **Import**.
   (Ggf. Vercel Zugriff auf das Repo geben.)
3. Framework wird automatisch als **Next.js** erkannt → Build-Einstellungen so lassen.

## 3. Environment Variables setzen (VOR dem ersten Deploy!)
Die `.env.local` wird NICHT mit hochgeladen (steht in .gitignore) – die Werte
müssen bei Vercel eingetragen werden. Unter **Environment Variables** diese
Namen mit den Werten aus deiner lokalen `.env.local` anlegen:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_ALLOWED_EMAILS`

(`GEMINI_API_KEY` wird erst für Phase 3 gebraucht – kann weg bleiben.)

> Tipp: Vercel erlaubt das Einfügen einer kompletten `.env` auf einmal
> ("Paste .env"). Einfach die relevanten Zeilen aus `.env.local` kopieren.

## 4. Deploy
1. **Deploy** klicken → ~1–2 Min warten.
2. Vercel gibt dir eine URL, z. B. `https://immo-interface-xxxx.vercel.app`.

## 5. Firebase: Domain freigeben (sonst kein Login online!)
1. Firebase Console → **Authentication → Settings → Authorized domains**.
2. **Add domain** → die Vercel-Domain eintragen (z. B. `immo-interface-xxxx.vercel.app`).
   Ohne das schlägt der Google-Login online mit `auth/unauthorized-domain` fehl.

## 6. Testen & teilen
1. Die Vercel-URL im Browser öffnen, mit erlaubtem Google-Konto einloggen.
2. Link an die Eltern geben (deren E-Mails müssen in der Allowlist stehen:
   `config/allowlist` in Firestore + `NEXT_PUBLIC_ALLOWED_EMAILS`).

## Danach
Jeder `git push` auf `main` löst automatisch ein neues Deployment aus.
