"use client";

// Login-Seite: Google-Sign-In. Nach erfolgreichem Login leiten wir zur Startseite.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { user, loading, error, configured, signInWithGoogle } = useAuth();
  const router = useRouter();

  // Wer schon eingeloggt ist, muss nicht auf der Login-Seite bleiben.
  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 p-6 dark:bg-black">
      <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Immo-Interface
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Bitte mit dem freigeschalteten Google-Konto anmelden.
        </p>

        {/* Hinweis, falls .env.local noch nicht ausgefuellt ist */}
        {!configured && (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            Firebase ist noch nicht konfiguriert. Trage die Werte in{" "}
            <code className="font-mono">.env.local</code> ein und starte den Server neu.
          </p>
        )}

        {/* Fehlermeldung (z.B. nicht freigeschaltet) */}
        {error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={loading || !configured}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Lade …" : "Mit Google anmelden"}
        </button>
      </div>
    </main>
  );
}
