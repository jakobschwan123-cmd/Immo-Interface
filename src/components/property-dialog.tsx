"use client";

// Dialog zum Anlegen ODER Bearbeiten einer Immobilie.
// - Ohne `property`  -> Anlegen (addProperty)
// - Mit `property`   -> Bearbeiten (updateProperty), Felder werden vorbefuellt
// Der Dialog wird von aussen gesteuert (open / onOpenChange), damit die
// Tabelle pro Zeile einen Bearbeiten-Button oeffnen kann.

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

import { addProperty, updateProperty } from "@/lib/properties";
import { euroInputToCents, centsToEuroInput } from "@/lib/money";
import { LEGAL_FORMS, type LegalForm, type Property } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";

// Formularzustand: alle Geldfelder als String (in Euro).
type FormState = {
  name: string;
  address: string;
  legalForm: LegalForm;
  purchaseDate: string;
  purchasePrice: string;
  landValue: string;
  buildingValue: string;
  afaRate: string;
  monthlyRent: string;
  monthlyCosts: string;
  marketValue: string;
};

const EMPTY: FormState = {
  name: "",
  address: "",
  legalForm: "Privat",
  purchaseDate: "",
  purchasePrice: "",
  landValue: "",
  buildingValue: "",
  afaRate: "2",
  monthlyRent: "",
  monthlyCosts: "",
  marketValue: "",
};

// Bestehende Immobilie -> Formularwerte (Cent -> Euro-String).
function formFromProperty(p: Property): FormState {
  return {
    name: p.name,
    address: p.address ?? "",
    legalForm: p.legalForm,
    purchaseDate: p.purchaseDate ?? "",
    purchasePrice: centsToEuroInput(p.purchasePriceCents),
    landValue: centsToEuroInput(p.landValueCents),
    buildingValue: centsToEuroInput(p.buildingValueCents),
    afaRate: String(p.afaRatePercent),
    monthlyRent: centsToEuroInput(p.monthlyRentCents),
    monthlyCosts: centsToEuroInput(p.monthlyCostsCents),
    marketValue: p.marketValueCents != null ? centsToEuroInput(p.marketValueCents) : "",
  };
}

export function PropertyDialog({
  open,
  onOpenChange,
  property,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property?: Property | null;
}) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  // Startwerte direkt aus der Immobilie ableiten. Das erneute Aufsetzen beim
  // Oeffnen erledigt der `key` am Dialog (siehe page.tsx) -> kein Effekt noetig.
  const [form, setForm] = useState<FormState>(() =>
    property ? formFromProperty(property) : EMPTY,
  );

  const isEdit = !!property;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.name.trim()) {
      toast.error("Bitte eine Bezeichnung eingeben.");
      return;
    }

    // Gemeinsame Felder (ohne createdBy) aus dem Formular bauen.
    const data = {
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
    };

    setSaving(true);
    try {
      if (property) {
        await updateProperty(property.id, data);
        toast.success("Änderungen gespeichert.");
      } else {
        await addProperty({ ...data, createdBy: user.uid });
        toast.success("Immobilie gespeichert.");
      }
      onOpenChange(false);
    } catch (err) {
      console.error("[Immobilie speichern]", err);
      toast.error("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Immobilie bearbeiten" : "Neue Immobilie"}
            </DialogTitle>
            <DialogDescription>
              Stammdaten erfassen. Beträge in Euro (z. B. 1200,50).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Bezeichnung *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="z. B. Musterstraße 1, Karlsruhe"
              />
            </div>

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
