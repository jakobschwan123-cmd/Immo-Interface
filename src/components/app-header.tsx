"use client";

// Kopfzeile der App: Name links, eingeloggter Nutzer + Abmelden rechts.

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between border-b bg-card px-6 py-3">
      <span className="text-lg font-semibold tracking-tight">Immo-Interface</span>
      {user && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
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
