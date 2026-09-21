"use client";

// Kopfzeile der App: Name links, eingeloggter Nutzer + Abmelden rechts.

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between border-b bg-card px-6 py-3 print:hidden">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Immo-Interface
        </Link>
        {user && (
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              Übersicht
            </Link>
            <Link
              href="/jahresabschluss"
              className="text-muted-foreground hover:text-foreground"
            >
              Jahresabschluss
            </Link>
          </nav>
        )}
      </div>
      {user && (
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {user.displayName ?? user.email}
          </span>
          <Button variant="outline" size="sm" onClick={logout}>
            Abmelden
          </Button>
        </div>
      )}
    </header>
  );
}
