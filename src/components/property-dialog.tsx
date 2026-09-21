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
import {
  LEGAL_FORMS,
  RENTAL_TYPES,
  type LegalForm,
  type RentalType,
  type Property,
  type Entity,
} from "@/lib/types";

// Sentinel-Wert fuer "kein Rechtsträger" (leerer String macht im Select Probleme).
const NO_ENTITY = "__none__";
import { useAuth } from "@/lib/auth-context";

// Formularzustand: alle Geldfelder als String (in Euro).
type FormState = {
  name: string;
  address: string;
  entityId: string; // Entity.id oder NO_ENTITY
  legalForm: LegalForm;
  rentalType: RentalType;
  area: string;
  units: string;
  purchaseDate: string;
  purchasePrice: string;
  landValue: string;
  buildingValue: string;
  afaRate: string;
  monthlyRent: string;
  marketValue: string;
  // Kostenpositionen (Euro-Strings)
  costElectricity: string;
  costWater: string;
  costInternet: string;
  costInsurance: string;
  costPropertyTax: string;
  costHausgeld: string;
  hausgeldOwnerPct: string;
  costOther: string;
  loanOriginal: string;
  loanRate: string;
  loanMonthly: string;
  loanStart: string;
};

const EMPTY: FormState = {
  name: "",
  address: "",
  entityId: NO_ENTITY,
  legalForm: "Privat",
  rentalType: "Dauervermietung",
  area: "",
  units: "",
  purchaseDate: "",
  purchasePrice: "",
  landValue: "",
  buildingValue: "",
  afaRate: "2",
  monthlyRent: "",
  marketValue: "",
  costElectricity: "",
  costWater: "",
  costInternet: "",
  costInsurance: "",
  costPropertyTax: "",
  costHausgeld: "",
  hausgeldOwnerPct: "50",
  costOther: "",
  loanOriginal: "",
  loanRate: "",
  loanMonthly: "",
  loanStart: "",
};

// Bestehende Immobilie -> Formularwerte (Cent -> Euro-String).
function formFromProperty(p: Property): FormState {
  return {
    name: p.name,
    address: p.address ?? "",
    entityId: p.entityId ?? NO_ENTITY,
    legalForm: p.legalForm,
    rentalType: p.rentalType ?? "Dauervermietung",
    area: p.areaSqm != null ? String(p.areaSqm) : "",
    units: p.units != null ? String(p.units) : "",
    purchaseDate: p.purchaseDate ?? "",
    purchasePrice: centsToEuroInput(p.purchasePriceCents),
    landValue: centsToEuroInput(p.landValueCents),
    buildingValue: centsToEuroInput(p.buildingValueCents),
    afaRate: String(p.afaRatePercent),
    monthlyRent: centsToEuroInput(p.monthlyRentCents),
    marketValue: p.marketValueCents != null ? centsToEuroInput(p.marketValueCents) : "",
    costElectricity: p.costElectricityCents != null ? centsToEuroInput(p.costElectricityCents) : "",
    costWater: p.costWaterCents != null ? centsToEuroInput(p.costWaterCents) : "",
    costInternet: p.costInternetCents != null ? centsToEuroInput(p.costInternetCents) : "",
    costInsurance: p.costInsuranceCents != null ? centsToEuroInput(p.costInsuranceCents) : "",
    costPropertyTax: p.costPropertyTaxCents != null ? centsToEuroInput(p.costPropertyTaxCents) : "",
    costHausgeld: p.costHausgeldTotalCents != null ? centsToEuroInput(p.costHausgeldTotalCents) : "",
    hausgeldOwnerPct: p.hausgeldOwnerPercent != null ? String(p.hausgeldOwnerPercent) : "50",
    costOther: p.costOtherCents != null ? centsToEuroInput(p.costOtherCents) : "",
    loanOriginal:
      p.loanOriginalCents != null ? centsToEuroInput(p.loanOriginalCents) : "",
    loanRate:
      p.loanInterestRatePercent != null ? String(p.loanInterestRatePercent) : "",
    loanMonthly:
      p.loanMonthlyPaymentCents != null
        ? centsToEuroInput(p.loanMonthlyPaymentCents)
        : "",
    loanStart: p.loanStartDate ?? "",
  };
}

export function PropertyDialog({
  open,
  onOpenChange,
  property,
  entities,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property?: Property | null;
  entities: Entity[];
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
      entityId: form.entityId === NO_ENTITY ? undefined : form.entityId,
      legalForm: form.legalForm,
      rentalType: form.rentalType,
      areaSqm: form.area ? Number(form.area.replace(",", ".")) || undefined : undefined,
      units: form.units ? Number(form.units) || undefined : undefined,
      purchaseDate: form.purchaseDate,
      purchasePriceCents: euroInputToCents(form.purchasePrice),
      landValueCents: euroInputToCents(form.landValue),
      buildingValueCents: euroInputToCents(form.buildingValue),
      afaRatePercent: Number(form.afaRate.replace(",", ".")) || 0,
      monthlyRentCents: euroInputToCents(form.monthlyRent),
      monthlyCostsCents: 0, // Legacy; Kosten kommen jetzt aus den Einzelpositionen
      marketValueCents: form.marketValue
        ? euroInputToCents(form.marketValue)
        : undefined,
      costElectricityCents: form.costElectricity
        ? euroInputToCents(form.costElectricity)
        : undefined,
      costWaterCents: form.costWater ? euroInputToCents(form.costWater) : undefined,
      costInternetCents: form.costInternet
        ? euroInputToCents(form.costInternet)
        : undefined,
      costInsuranceCents: form.costInsurance
        ? euroInputToCents(form.costInsurance)
        : undefined,
      costPropertyTaxCents: form.costPropertyTax
        ? euroInputToCents(form.costPropertyTax)
        : undefined,
      costHausgeldTotalCents: form.costHausgeld
        ? euroInputToCents(form.costHausgeld)
        : undefined,
      hausgeldOwnerPercent: form.costHausgeld
        ? Number(form.hausgeldOwnerPct.replace(",", ".")) || 50
        : undefined,
      costOtherCents: form.costOther ? euroInputToCents(form.costOther) : undefined,
      loanOriginalCents: form.loanOriginal
        ? euroInputToCents(form.loanOriginal)
        : undefined,
      loanInterestRatePercent: form.loanRate
        ? Number(form.loanRate.replace(",", ".")) || undefined
        : undefined,
      loanMonthlyPaymentCents: form.loanMonthly
        ? euroInputToCents(form.loanMonthly)
        : undefined,
      loanStartDate: form.loanStart || undefined,
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

            {/* Rechtsträger (Besitzer) */}
            <div className="grid gap-1.5">
              <Label>Rechtsträger</Label>
              <Select
                value={form.entityId}
                onValueChange={(v) => set("entityId", v ?? NO_ENTITY)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ENTITY}>Ohne Rechtsträger</SelectItem>
                  {entities.map((en) => (
                    <SelectItem key={en.id} value={en.id}>
                      {en.name} ({en.legalForm})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            {/* Vermietungstyp + m² + Einheiten */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Vermietungstyp</Label>
                <Select
                  value={form.rentalType}
                  onValueChange={(v) => set("rentalType", v as RentalType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RENTAL_TYPES.map((rt) => (
                      <SelectItem key={rt} value={rt}>
                        {rt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="area">Fläche (m²)</Label>
                  <Input
                    id="area"
                    inputMode="decimal"
                    value={form.area}
                    onChange={(e) => set("area", e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="units">Einheiten</Label>
                  <Input
                    id="units"
                    inputMode="numeric"
                    value={form.units}
                    onChange={(e) => set("units", e.target.value)}
                  />
                </div>
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

            {/* Einnahmen */}
            <div className="grid gap-1.5">
              <Label htmlFor="monthlyRent">
                {form.rentalType === "Dauervermietung"
                  ? "Kaltmiete / Monat (€)"
                  : "Einnahmen / Monat (€)"}
              </Label>
              <Input
                id="monthlyRent"
                inputMode="decimal"
                value={form.monthlyRent}
                onChange={(e) => set("monthlyRent", e.target.value)}
              />
            </div>

            {/* Kosten pro Monat (abhaengig von der Vermietungsart) */}
            <div className="border-t pt-3">
              <p className="mb-2 text-sm font-medium">Kosten pro Monat</p>

              {form.rentalType === "Dauervermietung" ? (
                <div className="grid gap-3">
                  <p className="text-xs text-muted-foreground">
                    Strom, Wasser & Internet zahlt der Mieter – hier nur deine
                    Eigentümer-Kosten.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="costInsurance">Gebäudeversicherung (€)</Label>
                      <Input id="costInsurance" inputMode="decimal" value={form.costInsurance} onChange={(e) => set("costInsurance", e.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="costPropertyTax">Grundsteuer (€)</Label>
                      <Input id="costPropertyTax" inputMode="decimal" value={form.costPropertyTax} onChange={(e) => set("costPropertyTax", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="costHausgeld">Hausgeld gesamt (€)</Label>
                      <Input id="costHausgeld" inputMode="decimal" value={form.costHausgeld} onChange={(e) => set("costHausgeld", e.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="hausgeldOwnerPct">davon Eigentümer (%)</Label>
                      <Input id="hausgeldOwnerPct" inputMode="decimal" value={form.hausgeldOwnerPct} onChange={(e) => set("hausgeldOwnerPct", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="costOther">Sonstiges (€)</Label>
                    <Input id="costOther" inputMode="decimal" value={form.costOther} onChange={(e) => set("costOther", e.target.value)} />
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  <p className="text-xs text-muted-foreground">
                    Du trägst alle laufenden Kosten selbst.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="costElectricity">Strom (€)</Label>
                      <Input id="costElectricity" inputMode="decimal" value={form.costElectricity} onChange={(e) => set("costElectricity", e.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="costWater">Wasser (€)</Label>
                      <Input id="costWater" inputMode="decimal" value={form.costWater} onChange={(e) => set("costWater", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="costInternet">Internet (€)</Label>
                      <Input id="costInternet" inputMode="decimal" value={form.costInternet} onChange={(e) => set("costInternet", e.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="costInsurance">Gebäudeversicherung (€)</Label>
                      <Input id="costInsurance" inputMode="decimal" value={form.costInsurance} onChange={(e) => set("costInsurance", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="costPropertyTax">Grundsteuer (€)</Label>
                      <Input id="costPropertyTax" inputMode="decimal" value={form.costPropertyTax} onChange={(e) => set("costPropertyTax", e.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="costOther">Sonstiges (€)</Label>
                      <Input id="costOther" inputMode="decimal" value={form.costOther} onChange={(e) => set("costOther", e.target.value)} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Finanzierung / Kredit (optional) */}
            <div className="border-t pt-3">
              <p className="mb-2 text-sm font-medium">Finanzierung (optional)</p>
              <p className="mb-2 text-xs text-muted-foreground">
                Restschuld & Enddatum werden daraus automatisch berechnet.
              </p>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="loanOriginal">Darlehenssumme (€)</Label>
                    <Input
                      id="loanOriginal"
                      inputMode="decimal"
                      value={form.loanOriginal}
                      onChange={(e) => set("loanOriginal", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="loanRate">Zinssatz (% p.a.)</Label>
                    <Input
                      id="loanRate"
                      inputMode="decimal"
                      value={form.loanRate}
                      onChange={(e) => set("loanRate", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="loanMonthly">Rate / Monat (€)</Label>
                    <Input
                      id="loanMonthly"
                      inputMode="decimal"
                      value={form.loanMonthly}
                      onChange={(e) => set("loanMonthly", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="loanStart">Kreditbeginn</Label>
                    <Input
                      id="loanStart"
                      type="date"
                      value={form.loanStart}
                      onChange={(e) => set("loanStart", e.target.value)}
                    />
                  </div>
                </div>
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
