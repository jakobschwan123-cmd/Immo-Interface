"use client";

// Kopfzeile der App: Name links, eingeloggter Nutzer + Abmelden rechts.

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { usePrivacy } from "@/lib/privacy-context";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

export function AppHeader() {
  const { user, logout } = useAuth();
  const { isPrivacyMode, togglePrivacyMode } = usePrivacy();

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
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePrivacyMode}
            title={
              isPrivacyMode
                ? "Datenschutzmodus aktiv (Zahlen ausgeblendet) – Klick zum Einblenden"
                : "Datenschutzmodus aktivieren (Zahlen ausblenden)"
            }
            className={`flex items-center gap-1.5 transition-colors ${
              isPrivacyMode
                ? "bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-200"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isPrivacyMode ? (
              <>
                <EyeOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="hidden text-xs font-medium sm:inline">Diskreter Modus</span>
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                <span className="hidden text-xs font-medium sm:inline">Diskretion</span>
              </>
            )}
          </Button>
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
