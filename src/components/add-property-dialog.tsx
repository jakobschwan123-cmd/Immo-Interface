"use client";

// Dialog mit Formular, um eine neue Immobilie anzulegen.
// Geldbetraege werden in Euro eingegeben und beim Speichern in Cent umgerechnet.

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

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

import { addProperty } from "@/lib/properties";
import { euroInputToCents } from "@/lib/money";
import { LEGAL_FORMS, type LegalForm } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";

// Leerer Startzustand des Formulars (alle Geldfelder als String in Euro).
const EMPTY = {
  name: "",
  address: "",
  legalForm: "Privat" as LegalForm,
  purchaseDate: "",
  purchasePrice: "",
  landValue: "",
  buildingValue: "",
  afaRate: "2",
  monthlyRent: "",
  monthlyCosts: "",
  marketValue: "",
};

export function AddPropertyDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  // Kleiner Helfer, um einzelne Felder zu aktualisieren.
  function set<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    // Pflichtfelder minimal pruefen.
    if (!form.name.trim()) {
      toast.error("Bitte eine Bezeichnung eingeben.");
      return;
    }

    setSaving(true);
    try {
      await addProperty({
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        legalForm: form.legalForm,
        purchaseDate: form.purchaseDate,
        purchasePriceCents: euroInputToCents(form.purchasePrice),
        landValueCents: euroInputToCents(form.landValue),
        buildingValueCents: euroInputToCents(form.buildingValue),
        afaRatePercent: Number(form.afaRate.replace(",", ".")) || 0,
        monthlyRentCents: euroInputToCents(form.monthlyRent),
        monthlyCostsCents: euroInputToCents(form.monthlyCosts),
        marketValueCents: form.marketValue
          ? euroInputToCents(form.marketValue)
          : undefined,
        createdBy: user.uid,
      });
      toast.success("Immobilie gespeichert.");
      setForm(EMPTY);
      setOpen(false);
    } catch (err) {
      console.error("[Immobilie speichern]", err);
      toast.error("Speichern fehlgeschlagen. Sind die Security Rules aktiv?");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus /> Immobilie hinzufügen
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Neue Immobilie</DialogTitle>
              <DialogDescription>
                Stammdaten erfassen. Beträge in Euro (z. B. 1200,50).
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Bezeichnung */}
              <div className="grid gap-1.5">
                <Label htmlFor="name">Bezeichnung *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="z. B. Musterstraße 1, Karlsruhe"
                />
              </div>

              {/* Adresse + Rechtsform */}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="address">Adresse</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Rechtsform</Label>
                  <Select
                    value={form.legalForm}
                    onValueChange={(v) => set("legalForm", v as LegalForm)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEGAL_FORMS.map((lf) => (
                        <SelectItem key={lf} value={lf}>
                          {lf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Kaufdatum + Kaufpreis */}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="purchaseDate">Kaufdatum</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={form.purchaseDate}
                    onChange={(e) => set("purchaseDate", e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="purchasePrice">Kaufpreis (€)</Label>
                  <Input
                    id="purchasePrice"
                    inputMode="decimal"
                    value={form.purchasePrice}
                    onChange={(e) => set("purchasePrice", e.target.value)}
                  />
                </div>
              </div>

              {/* Grund + Gebaeude (fuer AfA) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="landValue">Grundanteil (€)</Label>
                  <Input
                    id="landValue"
                    inputMode="decimal"
                    value={form.landValue}
                    onChange={(e) => set("landValue", e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="buildingValue">Gebäudeanteil (€)</Label>
                  <Input
                    id="buildingValue"
                    inputMode="decimal"
                    value={form.buildingValue}
                    onChange={(e) => set("buildingValue", e.target.value)}
                  />
                </div>
              </div>

              {/* AfA-Satz + Marktwert */}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="afaRate">AfA-Satz (% p.a.)</Label>
                  <Input
                    id="afaRate"
                    inputMode="decimal"
                    value={form.afaRate}
                    onChange={(e) => set("afaRate", e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="marketValue">Marktwert (€)</Label>
                  <Input
                    id="marketValue"
                    inputMode="decimal"
                    value={form.marketValue}
                    onChange={(e) => set("marketValue", e.target.value)}
                  />
                </div>
              </div>

              {/* Miete + laufende Kosten */}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="monthlyRent">Kaltmiete / Monat (€)</Label>
                  <Input
                    id="monthlyRent"
                    inputMode="decimal"
                    value={form.monthlyRent}
                    onChange={(e) => set("monthlyRent", e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="monthlyCosts">Kosten / Monat (€)</Label>
                  <Input
                    id="monthlyCosts"
                    inputMode="decimal"
                    value={form.monthlyCosts}
                    onChange={(e) => set("monthlyCosts", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
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
    </>
  );
}
