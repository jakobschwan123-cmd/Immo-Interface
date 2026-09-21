"use client";

// Detailseite einer einzelnen Immobilie: zeigt ALLE Stammdaten + Kennzahlen.
// Erreichbar ueber Klick auf den Objektnamen im Dashboard.

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import { subscribeProperty } from "@/lib/properties";
import { subscribeEntities } from "@/lib/entities";
import {
  subscribeTransactionsForProperty,
  deleteTransaction,
} from "@/lib/transactions";
import { calculateKpis } from "@/lib/finance";
import { formatEuro, formatPercent } from "@/lib/money";
import {
  signedAmountCents,
  type Property,
  type Entity,
  type Transaction,
} from "@/lib/types";

import { AppHeader } from "@/components/app-header";
import { PropertyDialog } from "@/components/property-dialog";
import { TransactionDialog } from "@/components/transaction-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  const [entities, setEntities] = useState<Entity[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [txOpen, setTxOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // Rechtsträger fuer Anzeige + Bearbeiten-Dialog laden.
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeEntities(setEntities, (err) =>
      console.error("[Entities laden]", err),
    );
    return () => unsubscribe();
  }, [user]);

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

  // Buchungen dieser Immobilie laden.
  useEffect(() => {
    if (!user || !id) return;
    const unsubscribe = subscribeTransactionsForProperty(
      id,
      setTransactions,
      (err) => {
        console.error("[Buchungen laden]", err);
        toast.error("Buchungen konnten nicht geladen werden.");
      },
    );
    return () => unsubscribe();
  }, [user, id]);

  async function handleDeleteTransaction(t: Transaction) {
    if (!confirm("Diese Buchung wirklich löschen?")) return;
    try {
      await deleteTransaction(t.id);
      toast.success("Buchung gelöscht.");
    } catch (err) {
      console.error("[Buchung loeschen]", err);
      toast.error("Löschen fehlgeschlagen.");
    }
  }

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
  const entity = entities.find((e) => e.id === property.entityId) ?? null;

  // Zusammenfassung der erfassten Buchungen (gesamt, ueber alle Jahre).
  const incomeCents = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amountCents, 0);
  const expenseCents = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amountCents, 0);
  const saldoCents = incomeCents - expenseCents;

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
              <Badge variant="secondary">
                {entity ? entity.name : "Ohne Rechtsträger"}
              </Badge>
              <Badge variant="outline">{property.legalForm}</Badge>
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

        {/* Buchungen (Einnahmen/Ausgaben) */}
        <Card className="mt-6">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Buchungen</CardTitle>
            <Button size="sm" onClick={() => setTxOpen(true)}>
              <Plus /> Buchung
            </Button>
          </CardHeader>
          <CardContent className="px-0">
            {/* Zusammenfassung */}
            <div className="mb-2 flex flex-wrap gap-x-8 gap-y-1 px-6 text-sm">
              <span>
                Einnahmen:{" "}
                <span className="font-medium tabular-nums text-emerald-600">
                  {formatEuro(incomeCents)}
                </span>
              </span>
              <span>
                Ausgaben:{" "}
                <span className="font-medium tabular-nums text-rose-600">
                  {formatEuro(expenseCents)}
                </span>
              </span>
              <span>
                Saldo:{" "}
                <span className="font-medium tabular-nums">
                  {formatEuro(saldoCents)}
                </span>
              </span>
            </div>

            {transactions.length === 0 ? (
              <p className="px-6 py-4 text-sm text-muted-foreground">
                Noch keine Buchungen erfasst.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Kategorie</TableHead>
                      <TableHead>Zweck</TableHead>
                      <TableHead className="text-right">Betrag</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t) => {
                      const signed = signedAmountCents(t);
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="tabular-nums">{t.date}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{t.category}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {t.description ?? "–"}
                          </TableCell>
                          <TableCell
                            className={`text-right tabular-nums ${
                              signed < 0 ? "text-rose-600" : "text-emerald-600"
                            }`}
                          >
                            {formatEuro(signed)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTransaction(t)}
                              aria-label="Löschen"
                            >
                              <Trash2 className="text-muted-foreground" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TransactionDialog
        open={txOpen}
        onOpenChange={setTxOpen}
        propertyId={property.id}
      />

      <PropertyDialog
        key={editOpen ? property.id : "closed"}
        open={editOpen}
        onOpenChange={setEditOpen}
        property={property}
        entities={entities}
      />
    </main>
  );
}
