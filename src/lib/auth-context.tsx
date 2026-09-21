"use client";

// Auth-Context: stellt der ganzen App den Login-Zustand bereit.
// Nutzung in einer Client-Komponente:  const { user, signInWithGoogle, logout } = useAuth();

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "./firebase";

// --- Whitelist -------------------------------------------------------------
// Erlaubte E-Mails aus .env.local (NEXT_PUBLIC_ALLOWED_EMAILS), komma-getrennt.
// WICHTIG: Das hier ist nur die freundliche UX-Vorpruefung im Browser.
// Die VERBINDLICHE Sperre kommt in Phase 2 ueber die Firestore Security Rules –
// eine reine Client-Pruefung kann man umgehen.
const allowedEmails = (process.env.NEXT_PUBLIC_ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  // Leere Whitelist -> nur fuer lokale Entwicklung: niemanden aussperren.
  // Sobald Werte gesetzt sind, wird strikt geprueft.
  if (allowedEmails.length === 0) {
    console.warn(
      "[Auth] Keine NEXT_PUBLIC_ALLOWED_EMAILS gesetzt – aktuell darf JEDE Google-Adresse rein. Vor dem echten Einsatz Whitelist befuellen!",
    );
    return true;
  }
  return allowedEmails.includes(email.toLowerCase());
}

// --- Context-Typ -----------------------------------------------------------
type AuthContextValue = {
  user: User | null; // eingeloggter Nutzer (oder null)
  loading: boolean; // true, solange der Login-Status noch geladen wird
  error: string | null; // letzte Fehlermeldung (z.B. nicht freigeschaltet)
  configured: boolean; // ist Firebase per .env.local konfiguriert?
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Ohne Firebase-Konfiguration gibt es nichts zu laden -> direkt false starten.
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [error, setError] = useState<string | null>(null);

  // Beim Start: auf Aenderungen des Login-Status hoeren.
  useEffect(() => {
    if (!isFirebaseConfigured) return; // loading ist bereits false
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Sicherheitsnetz: Falls ein eingeloggter Nutzer nicht (mehr) erlaubt ist,
      // sofort wieder ausloggen.
      if (firebaseUser && !isAllowed(firebaseUser.email)) {
        await signOut(auth);
        setUser(null);
        setError("Diese E-Mail ist nicht freigeschaltet.");
      } else {
        setUser(firebaseUser);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  async function signInWithGoogle() {
    setError(null);
    if (!isFirebaseConfigured) {
      setError("Firebase ist noch nicht konfiguriert (.env.local ausfuellen).");
      return;
    }
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      // Direkt nach dem Login gegen die Whitelist pruefen.
      if (!isAllowed(result.user.email)) {
        await signOut(auth);
        setUser(null);
        setError("Diese E-Mail ist nicht freigeschaltet.");
      }
    } catch (err) {
      // Nutzer hat das Popup abgebrochen o.ae. – ruhig behandeln.
      const code = (err as { code?: string })?.code ?? "";
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        console.error("[Auth] Login fehlgeschlagen:", err);
        setError("Login fehlgeschlagen. Bitte erneut versuchen.");
      }
    }
  }

  async function logout() {
    await signOut(auth);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, error, configured: isFirebaseConfigured, signInWithGoogle, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Bequemer Hook fuer den Zugriff auf den Auth-Context.
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth muss innerhalb von <AuthProvider> verwendet werden.");
  }
  return ctx;
}
