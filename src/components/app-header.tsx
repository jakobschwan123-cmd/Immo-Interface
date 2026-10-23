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
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b bg-card px-4 py-3 sm:px-6 print:hidden">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:gap-x-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Immo-Interface
        </Link>
        {user && (
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="py-2 text-muted-foreground hover:text-foreground">
              Übersicht
            </Link>
            <Link
              href="/jahresabschluss"
              className="py-2 text-muted-foreground hover:text-foreground"
            >
              Jahresabschluss
            </Link>
          </nav>
        )}
      </div>
      {user && (
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePrivacyMode}
            title={
              isPrivacyMode
                ? "Datenschutzmodus aktiv (Zahlen ausgeblendet) – Klick zum Einblenden"
                : "Datenschutzmodus aktivieren (Zahlen ausblenden)"
            }
            className={`flex items-center gap-1.5 transition-colors max-sm:h-10 max-sm:w-10 ${
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
          <Button variant="outline" size="sm" onClick={logout} className="max-sm:h-10">
            Abmelden
          </Button>
        </div>
      )}
    </header>
  );
}
