"use client";

// Datenschutz- / Privacy-Modus:
// Blendung aller sensiblen Finanzwerte via CSS-Blur.
// Zustand wird im localStorage ("immo_privacy_mode") gespeichert und per
// useSyncExternalStore gelesen (kein setState im Effect, hydration-sicher:
// der Server rendert immer "aus", der Client korrigiert danach).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";

interface PrivacyContextType {
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;
}

const PrivacyContext = createContext<PrivacyContextType>({
  isPrivacyMode: false,
  togglePrivacyMode: () => {},
});

const STORAGE_KEY = "immo_privacy_mode";

// Alle Abonnenten (Provider) im selben Tab; "storage" deckt andere Tabs ab.
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    // localStorage nicht verfügbar (z. B. privates Fenster mit Blockade)
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const isPrivacyMode = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  // Zustand aufs <html>-Element spiegeln (CSS-Selektor [data-privacy="true"]).
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-privacy",
      isPrivacyMode ? "true" : "false",
    );
  }, [isPrivacyMode]);

  const togglePrivacyMode = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, getSnapshot() ? "false" : "true");
    } catch {
      // ignore
    }
    listeners.forEach((l) => l());
  }, []);

  return (
    <PrivacyContext.Provider value={{ isPrivacyMode, togglePrivacyMode }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}
