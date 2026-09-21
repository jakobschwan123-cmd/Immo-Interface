"use client";

// Dialog zum Erfassen einer Buchung (Einnahme/Ausgabe) fuer eine Immobilie.

import { useState } from "react";
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

import { addTransaction } from "@/lib/transactions";
import { euroInputToCents } from "@/lib/money";
import {
  TRANSACTION_CATEGORIES,
  type TransactionCategory,
  type TransactionType,
} from "@/lib/types";
import { useAuth } from "@/lib/auth-context";

const TODAY = () => new Date().toISOString().slice(0, 10);

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
        createdBy: user.uid,
      });
      toast.success("Buchung gespeichert.");
      // Felder fuer die naechste Buchung teils zuruecksetzen.
      setAmount("");
      setDescription("");
      onOpenChange(false);
    } catch (err) {
      console.error("[Buchung speichern]", err);
      toast.error("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Neue Buchung</DialogTitle>
            <DialogDescription>
              Einnahme oder Ausgabe für diese Immobilie erfassen.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Art</Label>
                <Select
                  value={type}
                  onValueChange={(v) => setType((v as TransactionType) ?? "income")}
                >
                  <SelectTrigger className="w-full">
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
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="date">Datum</Label>
                <Input
                  id="date"
                  type="date"
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
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSACTION_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="description">Verwendungszweck</Label>
              <Input
                id="description"
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
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Speichere …" : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
