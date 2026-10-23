"use client";

// Dialog zum Erfassen einer Buchung (Einnahme/Ausgabe) fuer eine Immobilie.

import { useState } from "react";
import { Paperclip } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ReceiptUpload, deleteReceiptFile } from "@/components/receipt-upload";
import { addTransaction } from "@/lib/transactions";
import { applyExtraction, type ReceiptExtraction } from "@/lib/receipts";
import { euroInputToCents } from "@/lib/money";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type TransactionCategory,
  type TransactionType,
} from "@/lib/types";
import { anlageVBereich } from "@/lib/anlage-v";
import { useAuth } from "@/lib/auth-context";

// Lokales Datum (toISOString waere UTC -> um den Jahreswechsel der Vortag).
const TODAY = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function TransactionDialog({
  open,
  onOpenChange,
  propertyId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
}) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<TransactionType>("income");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(TODAY());
  const [category, setCategory] = useState<TransactionCategory>("Mieteinnahme");
  const [description, setDescription] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  // Storage-Pfad des hochgeladenen Belegs; wird erst mit "Speichern" Teil der Buchung.
  const [receiptPath, setReceiptPath] = useState<string | null>(null);

  // Auswahl je Art (Einnahme/Ausgabe); veraltete Kategorien sind nicht mehr waehlbar,
  // bestehende Buchungen behalten sie aber (keine Migration).
  const options: readonly TransactionCategory[] =
    type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const bereich = type === "repayment" ? null : anlageVBereich(type, category);

  function changeType(next: TransactionType) {
    setType(next);
    const nextOptions: readonly TransactionCategory[] =
      next === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (!nextOptions.includes(category)) setCategory(nextOptions[0]);
  }

  // Beleg (KI-Vorschlag) in die Felder uebernehmen; gespeichert wird erst per Klick.
  function handleExtracted(extraction: ReceiptExtraction, storagePath: string) {
    // Zweiter Upload ersetzt den ersten -> alte Datei nicht verwaisen lassen.
    if (receiptPath) void deleteReceiptFile(receiptPath);
    setReceiptPath(storagePath);
    const next = applyExtraction({ type, amount, date, category, description }, extraction);
    setType(next.type);
    setAmount(next.amount);
    setDate(next.date);
    setCategory(next.category);
    setDescription(next.description);
  }

  // Jedes Schliessen ohne Speichern (Abbrechen, X, Esc, Klick daneben) verwirft den Beleg.
  function handleOpenChange(next: boolean) {
    if (!next) {
      if (receiptPath) void deleteReceiptFile(receiptPath);
      setReceiptPath(null);
      setShowReceipt(false);
    }
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const amountCents = euroInputToCents(amount);
    if (amountCents <= 0) {
      toast.error("Bitte einen Betrag größer 0 eingeben.");
      return;
    }
    setSaving(true);
    try {
      await addTransaction({
        propertyId,
        type,
        amountCents,
        date,
        // Sondertilgung braucht keine EÜR-Kategorie.
        category: type === "repayment" ? "Sonstiges" : category,
        description: description.trim() || undefined,
        receiptPath: receiptPath ?? undefined,
        createdBy: user.uid,
      });
      toast.success("Buchung gespeichert.");
      // Felder fuer die naechste Buchung teils zuruecksetzen.
      setAmount("");
      setDescription("");
      // Beleg gehoert jetzt zur Buchung -> nicht beim Schliessen loeschen.
      setReceiptPath(null);
      setShowReceipt(false);
      onOpenChange(false);
    } catch (err) {
      console.error("[Buchung speichern]", err);
      toast.error("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Neue Buchung</DialogTitle>
            <DialogDescription>
              Einnahme oder Ausgabe für diese Immobilie erfassen.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {showReceipt ? (
              <ReceiptUpload propertyId={propertyId} onExtracted={handleExtracted} />
            ) : (
              <Button
                type="button"
                variant="outline"
                className="max-sm:h-10"
                onClick={() => setShowReceipt(true)}
              >
                <Paperclip /> Beleg hinzufügen (optional)
              </Button>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Art</Label>
                <Select
                  value={type}
                  onValueChange={(v) => changeType((v as TransactionType) ?? "income")}
                >
                  <SelectTrigger className="w-full max-sm:h-10!">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Einnahme</SelectItem>
                    <SelectItem value="expense">Ausgabe</SelectItem>
                    <SelectItem value="repayment">Sondertilgung</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="amount">Betrag (€)</Label>
                <Input
                  id="amount"
                  className="max-sm:h-10"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="date">Datum</Label>
                <Input
                  id="date"
                  type="date"
                  className="max-sm:h-10"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              {type !== "repayment" && (
                <div className="grid gap-1.5">
                  <Label>Kategorie</Label>
                  <Select
                    value={category}
                    onValueChange={(v) =>
                      setCategory((v as TransactionCategory) ?? "Sonstiges")
                    }
                  >
                    <SelectTrigger className="w-full max-sm:h-10!">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {bereich && (
              <p className="-mt-2 text-xs text-muted-foreground">
                Anlage V: {bereich.label} (Entwurf – vom Steuerberater zu bestätigen)
              </p>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="description">Verwendungszweck</Label>
              <Input
                id="description"
                className="max-sm:h-10"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="z. B. Miete März, Rechnung Sanitär …"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="max-sm:h-10"
              onClick={() => handleOpenChange(false)}
              disabled={saving}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving} className="max-sm:h-10">
              {saving ? "Speichere …" : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
