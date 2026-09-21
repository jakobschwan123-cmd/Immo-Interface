"use client";

// Startseite. Zeigt je nach Login-Status entweder eine Begruessung mit
// Logout-Button (eingeloggt) oder leitet zur Login-Seite (nicht eingeloggt).

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  // Nicht eingeloggte Nutzer auf die Login-Seite schicken.
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // Ladezustand, solange der Login-Status geprueft wird.
  if (loading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-sm text-zinc-500">Lade …</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      {/* Kopfzeile mit Nutzerinfo + Logout */}
      <header className="flex items-center justify-between border-b border-black/10 bg-white px-6 py-4 dark:border-white/10 dark:bg-zinc-900">
        <span className="font-semibold text-black dark:text-zinc-50">Immo-Interface</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {user.displayName ?? user.email}
          </span>
          <button
            type="button"
            onClick={logout}
            className="rounded-full border border-black/10 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
          >
            Abmelden
          </button>
        </div>
      </header>

      {/* Platzhalter-Inhalt – hier entsteht in Phase 2 das Dashboard. */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Willkommen{user.displayName ? `, ${user.displayName}` : ""} 👋
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Login funktioniert. Das Dashboard bauen wir in Phase 2.
          </p>
        </div>
      </div>
    </main>
  );
}
