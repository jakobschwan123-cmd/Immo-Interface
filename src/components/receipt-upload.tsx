"use client";

// Beleg hochladen (Firebase Storage) und per Gemini auslesen lassen (Phase 3).
// Die Komponente schreibt NICHTS in Firestore: Sie liefert nur einen Vorschlag
// per onExtracted(extraction, storagePath). Uebernehmen/Speichern entscheidet
// der Nutzer im Buchungsdialog.

import { useRef, useState } from "react";
import { ref, uploadBytes } from "firebase/storage";
import { Camera, FileUp, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { storage } from "@/lib/firebase";
import { formatEuro } from "@/lib/money";
import {
  EMPTY_EXTRACTION,
  MAX_PARSE_BYTES,
  MAX_UPLOAD_BYTES,
  RECEIPT_MIME_TYPES,
  normalizeReceiptExtraction,
  type ReceiptExtraction,
} from "@/lib/receipts";

// Laedt die Datei nach receipts/{propertyId}/{Zeitstempel}-{Name} und gibt den Pfad zurueck.
export async function uploadReceipt(propertyId: string, file: File): Promise<string> {
  const safeName = file.name.replace(/[^\w.-]+/g, "_").slice(-80) || "beleg";
  const path = `receipts/${propertyId}/${Date.now()}-${safeName}`;
  await uploadBytes(ref(storage, path), file, { contentType: file.type });
  return path;
}

// Handyfotos sind oft > 4 MB (Vercel-Limit der API). Nur fuer die Auslesung
// verkleinern – im Storage bleibt das Original.
async function shrinkImage(file: File): Promise<Blob> {
  // z. B. HEIC kann nicht jeder Browser dekodieren.
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("Bild zu groß zum Auslesen (max. 4 MB).");
  });
  const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", 0.85),
  );
}

async function parseReceipt(idToken: string, file: Blob): Promise<ReceiptExtraction> {
  const res = await fetch("/api/receipts/parse", {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}`, "Content-Type": file.type },
    body: file,
  });
  if (res.status === 413) throw new Error("Datei zu groß zum Auslesen (max. 4 MB).");
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? `Auslesen fehlgeschlagen (${res.status}).`);
  return normalizeReceiptExtraction(body);
}

type Status = "idle" | "uploading" | "parsing" | "done";

export function ReceiptUpload({
  propertyId,
  onExtracted,
}: {
  propertyId: string;
  onExtracted: (extraction: ReceiptExtraction, storagePath: string) => void;
}) {
  const { user } = useAuth();
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReceiptExtraction | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file || !user) return;
    setError(null);
    setResult(null);
    if (!RECEIPT_MIME_TYPES.includes(file.type)) {
      setError("Nur Bilder (JPG, PNG, WebP, HEIC) oder PDF.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("Datei zu groß (max. 10 MB).");
      return;
    }

    let storagePath: string;
    setStatus("uploading");
    try {
      storagePath = await uploadReceipt(propertyId, file);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      setError(
        code === "storage/unauthorized"
          ? "Keine Berechtigung zum Hochladen."
          : "Hochladen fehlgeschlagen.",
      );
      setStatus("idle");
      return;
    }

    // Ab hier ist der Beleg gespeichert. Scheitert das Auslesen, gibt es trotzdem
    // den Pfad (mit leerem Vorschlag) zurueck -> manuell erfassen.
    setStatus("parsing");
    let extraction: ReceiptExtraction = { ...EMPTY_EXTRACTION };
    try {
      const forApi =
        file.size > MAX_PARSE_BYTES && file.type.startsWith("image/") ? await shrinkImage(file) : file;
      extraction = await parseReceipt(await user.getIdToken(), forApi);
      setResult(extraction);
    } catch (err) {
      setError(
        `${err instanceof Error && err.message !== "toBlob" && !(err instanceof TypeError) ? err.message : "Auslesen fehlgeschlagen."} Beleg ist gespeichert – bitte Werte manuell eintragen.`,
      );
    }
    setStatus("done");
    onExtracted(extraction, storagePath);
  }

  const busy = status === "uploading" || status === "parsing";

  return (
    <div className="grid gap-2 rounded-lg border border-dashed p-3">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1 max-sm:h-10"
          disabled={busy}
          onClick={() => cameraRef.current?.click()}
        >
          <Camera /> Foto aufnehmen
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1 max-sm:h-10"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <FileUp /> Datei wählen
        </Button>
      </div>

      {busy && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {status === "uploading" ? "Lade Beleg hoch …" : "Lese Beleg aus …"}
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Betrag</dt>
          <dd className="privacy-blur tabular-nums">
            {result.amountCents !== null ? formatEuro(result.amountCents) : "–"}
          </dd>
          <dt className="text-muted-foreground">Datum</dt>
          <dd>{result.date ? result.date.split("-").reverse().join(".") : "–"}</dd>
          <dt className="text-muted-foreground">Zweck</dt>
          <dd className="break-words">{result.description ?? "–"}</dd>
          <dt className="text-muted-foreground">Kategorie</dt>
          <dd>{result.categorySuggestion ?? "–"}</dd>
          <dd className="col-span-2 text-xs text-muted-foreground">
            Vorschlag der KI{result.confidence != null ? ` (Sicherheit ${Math.round(result.confidence * 100)} %)` : ""} – bitte prüfen.
          </dd>
        </dl>
      )}
    </div>
  );
}
