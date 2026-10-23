"use client";

// Dialog zum Anlegen ODER Bearbeiten einer Immobilie.
// - Ohne `property`  -> Anlegen (addProperty)
// - Mit `property`   -> Bearbeiten (updateProperty), Felder werden vorbefuellt
// Der Dialog wird von aussen gesteuert (open / onOpenChange), damit die
// Tabelle pro Zeile einen Bearbeiten-Button oeffnen kann.

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

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
  unitRents: { label: string; rent: string }[];
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
  // Ertragswert (optional)
  landArea: string; // m²
  landRate: string; // Bodenrichtwert €/m²
  capRate: string; // Liegenschaftszins %
  remainingLife: string; // Jahre
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
  unitRents: [],
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
  landArea: "",
  landRate: "",
  capRate: "",
  remainingLife: "",
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
    unitRents: (p.unitRents ?? []).map((u) => ({
      label: u.label,
      rent: centsToEuroInput(u.rentCents),
    })),
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
    landArea: p.landAreaSqm != null ? String(p.landAreaSqm) : "",
    landRate: p.landRateCentsPerSqm != null ? centsToEuroInput(p.landRateCentsPerSqm) : "",
    capRate: p.capRateBasisPoints != null ? String(p.capRateBasisPoints / 100) : "",
    remainingLife: p.remainingLifeYears != null ? String(p.remainingLifeYears) : "",
  };
}

// Zahl-Eingabe (Komma oder Punkt) -> number; leer/ungueltig -> undefined.
// 0 bleibt erhalten (z.B. Liegenschaftszins 0 %).
function optionalNumber(input: string): number | undefined {
  if (!input.trim()) return undefined;
  const n = Number(input.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
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

  // --- Einheiten-Zeilen (Miete je Einheit) ---
  function addUnit() {
    setForm((f) => ({ ...f, unitRents: [...f.unitRents, { label: "", rent: "" }] }));
  }
  function updateUnit(i: number, key: "label" | "rent", value: string) {
    setForm((f) => ({
      ...f,
      unitRents: f.unitRents.map((u, idx) => (idx === i ? { ...u, [key]: value } : u)),
    }));
  }
  function removeUnit(i: number) {
    setForm((f) => ({ ...f, unitRents: f.unitRents.filter((_, idx) => idx !== i) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.name.trim()) {
      toast.error("Bitte eine Bezeichnung eingeben.");
      return;
    }

    // Einheiten mit Betrag bereinigen (leere Zeilen ignorieren).
    const unitRentsClean = form.unitRents
      .filter((u) => u.rent.trim() !== "" || u.label.trim() !== "")
      .map((u, i) => ({
        label: u.label.trim() || `Einheit ${i + 1}`,
        rentCents: euroInputToCents(u.rent),
      }));
    const hasUnits = unitRentsClean.length > 0;

    const capRatePercent = optionalNumber(form.capRate);

    // Gemeinsame Felder (ohne createdBy) aus dem Formular bauen.
    const data = {
      name: form.name.trim(),
      address: form.address.trim() || undefined,
      entityId: form.entityId === NO_ENTITY ? undefined : form.entityId,
      legalForm: form.legalForm,
      rentalType: form.rentalType,
      areaSqm: form.area ? Number(form.area.replace(",", ".")) || undefined : undefined,
      // Bei erfassten Einheiten die Anzahl daraus ableiten.
      units: hasUnits
        ? unitRentsClean.length
        : form.units
          ? Number(form.units) || undefined
          : undefined,
      purchaseDate: form.purchaseDate,
      purchasePriceCents: euroInputToCents(form.purchasePrice),
      landValueCents: euroInputToCents(form.landValue),
      buildingValueCents: euroInputToCents(form.buildingValue),
      afaRatePercent: Number(form.afaRate.replace(",", ".")) || 0,
      monthlyRentCents: hasUnits
        ? unitRentsClean.reduce((s, u) => s + u.rentCents, 0)
        : euroInputToCents(form.monthlyRent),
      unitRents: hasUnits ? unitRentsClean : undefined,
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
      // Leere Felder -> undefined (Ertragswert wird dann nicht berechnet).
      // Liegenschaftszins: Eingabe in %, gespeichert in Basispunkten (3,5 -> 350).
      landAreaSqm: optionalNumber(form.landArea),
      landRateCentsPerSqm: form.landRate ? euroInputToCents(form.landRate) : undefined,
      capRateBasisPoints:
        capRatePercent != null ? Math.round(capRatePercent * 100) : undefined,
      remainingLifeYears: optionalNumber(form.remainingLife),
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
              <Input className="max-sm:h-10"
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
                <SelectTrigger className="w-full max-sm:h-10!">
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="address">Adresse</Label>
                <Input className="max-sm:h-10"
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
                  <SelectTrigger className="w-full max-sm:h-10!">
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Vermietungstyp</Label>
                <Select
                  value={form.rentalType}
                  onValueChange={(v) => set("rentalType", v as RentalType)}
                >
                  <SelectTrigger className="w-full max-sm:h-10!">
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
                  <Input className="max-sm:h-10"
                    id="area"
                    inputMode="decimal"
                    value={form.area}
                    onChange={(e) => set("area", e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="units">Einheiten</Label>
                  <Input className="max-sm:h-10"
                    id="units"
                    inputMode="numeric"
                    value={form.units}
                    onChange={(e) => set("units", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="purchaseDate">Kaufdatum</Label>
                <Input className="max-sm:h-10"
                  id="purchaseDate"
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) => set("purchaseDate", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="purchasePrice">Kaufpreis (€)</Label>
                <Input className="max-sm:h-10"
                  id="purchasePrice"
                  inputMode="decimal"
                  value={form.purchasePrice}
                  onChange={(e) => set("purchasePrice", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="landValue">Grundanteil (€)</Label>
                <Input className="max-sm:h-10"
                  id="landValue"
                  inputMode="decimal"
                  value={form.landValue}
                  onChange={(e) => set("landValue", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="buildingValue">Gebäudeanteil (€)</Label>
                <Input className="max-sm:h-10"
                  id="buildingValue"
                  inputMode="decimal"
                  value={form.buildingValue}
                  onChange={(e) => set("buildingValue", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="afaRate">AfA-Satz (% p.a.)</Label>
                <Input className="max-sm:h-10"
                  id="afaRate"
                  inputMode="decimal"
                  value={form.afaRate}
                  onChange={(e) => set("afaRate", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="marketValue">Marktwert (€)</Label>
                <Input className="max-sm:h-10"
                  id="marketValue"
                  inputMode="decimal"
                  value={form.marketValue}
                  onChange={(e) => set("marketValue", e.target.value)}
                />
              </div>
            </div>

            {/* Einnahmen (Einzelfeld nur, wenn keine Einheiten erfasst) */}
            {form.unitRents.length === 0 && (
              <div className="grid gap-1.5">
                <Label htmlFor="monthlyRent">
                  {form.rentalType === "Dauervermietung"
                    ? "Kaltmiete / Monat (€)"
                    : "Einnahmen / Monat (€)"}
                </Label>
                <Input className="max-sm:h-10"
                  id="monthlyRent"
                  inputMode="decimal"
                  value={form.monthlyRent}
                  onChange={(e) => set("monthlyRent", e.target.value)}
                />
              </div>
            )}

            {/* Einheiten & Mieten (optional, z.B. Mehrfamilienhaus) */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Einheiten &amp; Mieten (optional)</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addUnit} className="max-sm:h-10">
                  <Plus /> Einheit
                </Button>
              </div>
              {form.unitRents.length > 0 && (
                <div className="mt-2 grid gap-2">
                  {form.unitRents.map((u, i) => (
                    <div key={i} className="flex items-end gap-2">
                      <div className="grid flex-1 gap-1.5">
                        <Label htmlFor={`unit-label-${i}`} className="text-xs">
                          Bezeichnung
                        </Label>
                        <Input className="max-sm:h-10"
                          id={`unit-label-${i}`}
                          value={u.label}
                          placeholder={`Einheit ${i + 1}`}
                          onChange={(e) => updateUnit(i, "label", e.target.value)}
                        />
                      </div>
                      <div className="grid w-28 gap-1.5 sm:w-32">
                        <Label htmlFor={`unit-rent-${i}`} className="text-xs">
                          Miete/Monat (€)
                        </Label>
                        <Input className="max-sm:h-10"
                          id={`unit-rent-${i}`}
                          inputMode="decimal"
                          value={u.rent}
                          onChange={(e) => updateUnit(i, "rent", e.target.value)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="max-sm:size-10"
                        onClick={() => removeUnit(i)}
                        aria-label="Einheit entfernen"
                      >
                        <Trash2 className="text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Gesamtmiete = Summe der Einheiten (das Einzelfeld oben entfällt).
                  </p>
                </div>
              )}
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
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="costInsurance">Gebäudeversicherung (€)</Label>
                      <Input className="max-sm:h-10" id="costInsurance" inputMode="decimal" value={form.costInsurance} onChange={(e) => set("costInsurance", e.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="costPropertyTax">Grundsteuer (€)</Label>
                      <Input className="max-sm:h-10" id="costPropertyTax" inputMode="decimal" value={form.costPropertyTax} onChange={(e) => set("costPropertyTax", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="costHausgeld">Hausgeld gesamt (€)</Label>
                      <Input className="max-sm:h-10" id="costHausgeld" inputMode="decimal" value={form.costHausgeld} onChange={(e) => set("costHausgeld", e.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="hausgeldOwnerPct">davon Eigentümer (%)</Label>
                      <Input className="max-sm:h-10" id="hausgeldOwnerPct" inputMode="decimal" value={form.hausgeldOwnerPct} onChange={(e) => set("hausgeldOwnerPct", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="costOther">Sonstiges (€)</Label>
                    <Input className="max-sm:h-10" id="costOther" inputMode="decimal" value={form.costOther} onChange={(e) => set("costOther", e.target.value)} />
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  <p className="text-xs text-muted-foreground">
                    Du trägst alle laufenden Kosten selbst.
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="costElectricity">Strom (€)</Label>
                      <Input className="max-sm:h-10" id="costElectricity" inputMode="decimal" value={form.costElectricity} onChange={(e) => set("costElectricity", e.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="costWater">Wasser (€)</Label>
                      <Input className="max-sm:h-10" id="costWater" inputMode="decimal" value={form.costWater} onChange={(e) => set("costWater", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="costInternet">Internet (€)</Label>
                      <Input className="max-sm:h-10" id="costInternet" inputMode="decimal" value={form.costInternet} onChange={(e) => set("costInternet", e.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="costInsurance">Gebäudeversicherung (€)</Label>
                      <Input className="max-sm:h-10" id="costInsurance" inputMode="decimal" value={form.costInsurance} onChange={(e) => set("costInsurance", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="costPropertyTax">Grundsteuer (€)</Label>
                      <Input className="max-sm:h-10" id="costPropertyTax" inputMode="decimal" value={form.costPropertyTax} onChange={(e) => set("costPropertyTax", e.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="costOther">Sonstiges (€)</Label>
                      <Input className="max-sm:h-10" id="costOther" inputMode="decimal" value={form.costOther} onChange={(e) => set("costOther", e.target.value)} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Ertragswert (optional) */}
            <div className="border-t pt-3">
              <p className="mb-2 text-sm font-medium">Ertragswert (optional)</p>
              <p className="mb-2 text-xs text-muted-foreground">
                Bodenrichtwert z. B. aus BORIS-NRW. Ohne alle vier Angaben wird kein
                Ertragswert berechnet.
              </p>
              <div className="grid gap-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="landArea">Grundstücksfläche (m²)</Label>
                    <Input className="max-sm:h-10" id="landArea" inputMode="decimal" value={form.landArea} onChange={(e) => set("landArea", e.target.value)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="landRate">Bodenrichtwert (€/m²)</Label>
                    <Input className="max-sm:h-10" id="landRate" inputMode="decimal" value={form.landRate} onChange={(e) => set("landRate", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="capRate">Liegenschaftszins (%)</Label>
                    <Input className="max-sm:h-10" id="capRate" inputMode="decimal" value={form.capRate} onChange={(e) => set("capRate", e.target.value)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="remainingLife">Restnutzungsdauer (Jahre)</Label>
                    <Input className="max-sm:h-10" id="remainingLife" inputMode="numeric" value={form.remainingLife} onChange={(e) => set("remainingLife", e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Finanzierung / Kredit (optional) */}
            <div className="border-t pt-3">
              <p className="mb-2 text-sm font-medium">Finanzierung (optional)</p>
              <p className="mb-2 text-xs text-muted-foreground">
                Restschuld & Enddatum werden daraus automatisch berechnet.
              </p>
              <div className="grid gap-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="loanOriginal">Darlehenssumme (€)</Label>
                    <Input className="max-sm:h-10"
                      id="loanOriginal"
                      inputMode="decimal"
                      value={form.loanOriginal}
                      onChange={(e) => set("loanOriginal", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="loanRate">Zinssatz (% p.a.)</Label>
                    <Input className="max-sm:h-10"
                      id="loanRate"
                      inputMode="decimal"
                      value={form.loanRate}
                      onChange={(e) => set("loanRate", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="loanMonthly">Rate / Monat (€)</Label>
                    <Input className="max-sm:h-10"
                      id="loanMonthly"
                      inputMode="decimal"
                      value={form.loanMonthly}
                      onChange={(e) => set("loanMonthly", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="loanStart">Kreditbeginn</Label>
                    <Input className="max-sm:h-10"
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
              className="max-sm:h-10"
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
