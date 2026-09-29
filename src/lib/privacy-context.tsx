"use client";

// Datenschutz- / Privacy-Modus:
// Blendung aller sensiblen Finanzwerte via CSS-Blur.
// Zustand wird im localStorage ("immo_privacy_mode") gespeichert.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
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

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialwert aus localStorage lesen
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") {
        setIsPrivacyMode(true);
        document.documentElement.setAttribute("data-privacy", "true");
      } else {
        document.documentElement.setAttribute("data-privacy", "false");
      }
    } catch {
      // localStorage nicht verfügbar (z. B. privates Fenster mit Blockade)
    }
    setMounted(true);
  }, []);

  // Änderungen auf DOM & localStorage spiegeln
  const togglePrivacyMode = useCallback(() => {
    setIsPrivacyMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "true" : "false");
      } catch {
        // ignore
      }
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-privacy", next ? "true" : "false");
      }
      return next;
    });
  }, []);

  return (
    <PrivacyContext.Provider
      value={{
        isPrivacyMode: mounted ? isPrivacyMode : false,
        togglePrivacyMode,
      }}
    >
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}
