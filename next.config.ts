import type { NextConfig } from "next";

// Nur Warnung, kein Abbruch: ohne Whitelist darf jede Google-Adresse rein.
if (!process.env.NEXT_PUBLIC_ALLOWED_EMAILS?.trim()) {
  console.warn(
    "[next.config] NEXT_PUBLIC_ALLOWED_EMAILS ist leer – Client-Whitelist inaktiv. Vor dem echten Einsatz befüllen!",
  );
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
