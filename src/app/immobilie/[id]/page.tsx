"use client";

// Detailseite einer einzelnen Immobilie: zeigt ALLE Stammdaten + Kennzahlen.
// Erreichbar ueber Klick auf den Objektnamen im Dashboard.

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import { subscribeProperty } from "@/lib/properties";
import { calculateKpis } from "@/lib/finance";
import { formatEuro, formatPercent } from "@/lib/money";
import type { Property } from "@/lib/types";

import { AppHeader } from "@/components/app-header";
import { PropertyDialog } from "@/components/property-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Eine Zeile "Bezeichnung ... Wert" in den Detail-Karten.
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default function PropertyDetail() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [property, setProperty] = useState<Property | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user || !id) return;
    const unsubscribe = subscribeProperty(
      id,
      (p) => {
        setProperty(p);
        setDataLoading(false);
      },
      (err) => {
        console.error("[Immobilie laden]", err);
        toast.error("Immobilie konnte nicht geladen werden.");
        setDataLoading(false);
      },
    );
    return () => unsubscribe();
  }, [user, id]);

  if (loading || !user || dataLoading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Lade …</p>
      </main>
    );
  }

  if (!property) {
    return (
      <main className="flex flex-1 flex-col bg-muted/30">
        <AppHeader />
        <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Zurück zur Übersicht
          </Link>
          <p className="mt-8 text-center text-muted-foreground">
            Diese Immobilie existiert nicht (mehr).
          </p>
        </div>
      </main>
    );
  }

  const k = calculateKpis(property);
  const wertzuwachsCents =
    property.marketValueCents != null
      ? property.marketValueCents - property.purchasePriceCents
      : null;

  return (
    <main className="flex flex-1 flex-col bg-muted/30">
      <AppHeader />

      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        {/* Zurueck-Link + Titel + Bearbeiten */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Zurück zur Übersicht
        </Link>

        <div className="mt-3 mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {property.name}
            </h1>
            {property.address && (
              <p className="text-sm text-muted-foreground">{property.address}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary">{property.legalForm}</Badge>
              <Badge variant="outline">
                {property.rentalType ?? "Dauervermietung"}
              </Badge>
            </div>
          </div>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil /> Bearbeiten
          </Button>
        </div>

        {property.rentalType === "Ferienvermietung" && (
          <p className="mb-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            Ferienvermietung: Die tatsächlichen Einnahmen erfassen wir später
            über einzelne Buchungen. Die monatliche Kaltmiete ist hier nur ein
            grober Schätzwert.
          </p>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Stammdaten */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stammdaten</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <Row
                label="Kaufdatum"
                value={property.purchaseDate || "–"}
              />
              <Row
                label="Fläche"
                value={property.areaSqm != null ? `${property.areaSqm} m²` : "–"}
              />
              <Row
                label="Einheiten"
                value={property.units != null ? property.units : "–"}
              />
              <Row
                label="Kaufpreis"
                value={formatEuro(property.purchasePriceCents)}
              />
              <Row
                label="Grundanteil"
                value={formatEuro(property.landValueCents)}
              />
              <Row
                label="Gebäudeanteil"
                value={formatEuro(property.buildingValueCents)}
              />
              <Row label="AfA-Satz" value={`${property.afaRatePercent} %`} />
              <Row
                label="Marktwert"
                value={
                  property.marketValueCents != null
                    ? formatEuro(property.marketValueCents)
                    : "–"
                }
              />
              {wertzuwachsCents != null && (
                <Row
                  label="Wertzuwachs"
                  value={formatEuro(wertzuwachsCents)}
                />
              )}
            </CardContent>
          </Card>

          {/* Kennzahlen */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kennzahlen (pro Jahr)</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <Row label="Kaltmiete / Monat" value={formatEuro(property.monthlyRentCents)} />
              <Row label="Kosten / Monat" value={formatEuro(property.monthlyCostsCents)} />
              <Row label="Mieteinnahmen / Jahr" value={formatEuro(k.annualRentCents)} />
              <Row label="Kosten / Jahr" value={formatEuro(k.annualCostsCents)} />
              <Row label="AfA / Jahr" value={formatEuro(k.annualAfaCents)} />
              <Row
                label="Überschuss / Jahr (vor Steuer)"
                value={formatEuro(k.annualSurplusCents)}
              />
              <Row label="Rendite brutto" value={formatPercent(k.grossYieldPercent)} />
              <Row label="Rendite netto" value={formatPercent(k.netYieldPercent)} />
            </CardContent>
          </Card>
        </div>
      </div>

      <PropertyDialog
        key={editOpen ? property.id : "closed"}
        open={editOpen}
        onOpenChange={setEditOpen}
        property={property}
      />
    </main>
  );
}
