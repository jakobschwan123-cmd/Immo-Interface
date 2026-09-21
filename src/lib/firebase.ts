// Firebase-Initialisierung (Client-SDK).
// Diese Datei wird von Client-Komponenten importiert. Alle Werte stammen aus
// .env.local (Praefix NEXT_PUBLIC_ -> im Browser verfuegbar, bei Firebase ok).

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// true, sobald ALLE noetigen Werte in .env.local gesetzt sind.
// Damit kann die UI freundlich warnen, statt mit kryptischen Fehlern abzustuerzen.
export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

// Firebase NUR initialisieren, wenn konfiguriert. Sonst wuerde z.B. getAuth()
// sofort mit "auth/invalid-api-key" abstuerzen – wir wollen aber, dass die App
// auch ohne .env.local startet und die Login-Seite die Warnung anzeigt.
// getApps() verhindert doppelte Initialisierung beim Hot-Reload.
const app: FirebaseApp | undefined = isFirebaseConfigured
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : undefined;

// Zentrale Firebase-Dienste. Der Cast ist bewusst: Sie sind nur "undefined",
// solange Firebase nicht konfiguriert ist – und in dem Fall greift der ganze
// App-Code sowieso erst nach der Pruefung `isFirebaseConfigured` darauf zu.
export const auth: Auth = (app ? getAuth(app) : undefined) as Auth;

// Firestore mit ignoreUndefinedProperties: leere/optionale Felder (undefined)
// werden beim Schreiben ignoriert, statt einen Fehler zu werfen.
// initializeFirestore darf nur EINMAL laufen -> beim Hot-Reload faellt es auf
// getFirestore zurueck.
export const db: Firestore = (
  app
    ? (() => {
        try {
          return initializeFirestore(app, { ignoreUndefinedProperties: true });
        } catch {
          return getFirestore(app);
        }
      })()
    : undefined
) as Firestore;

export const storage: FirebaseStorage = (app ? getStorage(app) : undefined) as FirebaseStorage;

export default app;
