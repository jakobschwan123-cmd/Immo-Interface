"use client";

// Dashboard: Gesamt-Überblick aller Immobilien, gruppiert nach Rechtsträger.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Pencil, Plus, Users } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import { subscribeProperties, deleteProperty } from "@/lib/properties";
import { subscribeEntities } from "@/lib/entities";
import { subscribeAllTransactions } from "@/lib/transactions";
import { calculateKpis, sumKpis, effectiveMonthlyRentCents } from "@/lib/finance";
import { computeLoan } from "@/lib/loan";
import { formatEuro, formatPercent } from "@/lib/money";
import type { Property, Entity, Transaction } from "@/lib/types";

// Sondertilgungen einer Immobilie aus der Buchungsliste ziehen.
function repaymentsFor(propertyId: string, transactions: Transaction[]) {
  return transactions
    .filter((t) => t.type === "repayment" && t.propertyId === propertyId)
    .map((t) => ({ amountCents: t.amountCents, date: t.date }));
}

import { AppHeader } from "@/components/app-header";
import { PropertyDialog } from "@/components/property-dialog";
import { EntityManagerDialog } from "@/components/entity-manager-dialog";
import { PortfolioCharts } from "@/components/portfolio-charts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

// Tabelle der Immobilien einer Gruppe inkl. Summenzeile.
function PropertyTable({
  props,
  transactions,
  onEdit,
  onDelete,
}: {
  props: Property[];
  transactions: Transaction[];
  onEdit: (p: Property) => void;
  onDelete: (p: Property) => void;
}) {
  const totals = sumKpis(props, transactions);
  const monthlyRentSum = props.reduce(
    (s, p) => s + effectiveMonthlyRentCents(p),
    0,
  );
  const grossYield =
    totals.totalPurchaseCents > 0
      ? (totals.annualRentCents / totals.totalPurchaseCents) * 100
      : 0;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Objekt</TableHead>
            <TableHead className="text-right">Kaufpreis</TableHead>
            <TableHead className="text-right">Restschuld</TableHead>
            <TableHead className="text-right">Miete / Monat</TableHead>
            <TableHead className="text-right">Rendite (brutto)</TableHead>
            <TableHead className="text-right">AfA / Jahr</TableHead>
            <TableHead className="text-right">Überschuss / Jahr</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.map((p) => {
            const k = calculateKpis(p);
            return (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  <Link href={`/immobilie/${p.id}`} className="hover:underline">
                    {p.name}
                  </Link>
                  {p.address && (
                    <span className="block text-xs text-muted-foreground">
                      {p.address}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatEuro(p.purchasePriceCents)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatEuro(
                    computeLoan(p, repaymentsFor(p.id, transactions))
                      .remainingCents,
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatEuro(effectiveMonthlyRentCents(p))}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPercent(k.grossYieldPercent)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatEuro(k.annualAfaCents)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatEuro(k.annualSurplusCents)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(p)}
                      aria-label="Bearbeiten"
                    >
                      <Pencil className="text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(p)}
                      aria-label="Löschen"
                    >
                      <Trash2 className="text-muted-foreground" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        {props.length > 1 && (
          <TableFooter>
            <TableRow>
              <TableCell className="font-medium">Summe</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatEuro(totals.totalPurchaseCents)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatEuro(totals.totalLoanRemainingCents)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatEuro(monthlyRentSum)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatPercent(grossYield)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatEuro(totals.annualAfaCents)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatEuro(totals.annualSurplusCents)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [properties, setProperties] = useState<Property[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [entityManagerOpen, setEntityManagerOpen] = useState(false);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(p: Property) {
    setEditing(p);
    setDialogOpen(true);
  }

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const unsubProps = subscribeProperties(
      (data) => {
        setProperties(data);
        setDataLoading(false);
      },
      (err) => {
        console.error("[Properties laden]", err);
        toast.error("Daten konnten nicht geladen werden.");
        setDataLoading(false);
      },
    );
    const unsubEntities = subscribeEntities(setEntities, (err) =>
      console.error("[Entities laden]", err),
    );
    const unsubTx = subscribeAllTransactions(setTransactions, (err) =>
      console.error("[Transactions laden]", err),
    );
    return () => {
      unsubProps();
      unsubEntities();
      unsubTx();
    };
  }, [user]);

  async function handleDelete(p: Property) {
    if (!confirm(`„${p.name}" wirklich löschen?`)) return;
    try {
      await deleteProperty(p.id);
      toast.success("Immobilie gelöscht.");
    } catch (err) {
      console.error("[Loeschen]", err);
      toast.error("Löschen fehlgeschlagen.");
    }
  }

  if (loading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Lade …</p>
      </main>
    );
  }

  const totals = sumKpis(properties, transactions);
  // Gesamtvermögen (grob): aktueller Marktwert minus Restschulden.
  const netWorthCents = totals.totalMarketValueCents - totals.totalLoanRemainingCents;

  // Immobilien nach Rechtsträger gruppieren.
  const entityMap = new Map(entities.map((e) => [e.id, e]));
  const groups: { entity: Entity | null; props: Property[] }[] = [];
  for (const e of entities) {
    const props = properties.filter((p) => p.entityId === e.id);
    if (props.length) groups.push({ entity: e, props });
  }
  const orphan = properties.filter(
    (p) => !p.entityId || !entityMap.has(p.entityId),
  );
  if (orphan.length) groups.push({ entity: null, props: orphan });

  return (
    <main className="flex flex-1 flex-col bg-muted/30">
      <AppHeader />

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {/* Titelzeile mit Aktionen */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Übersicht</h1>
            <p className="text-sm text-muted-foreground">
              {properties.length}{" "}
              {properties.length === 1 ? "Immobilie" : "Immobilien"} ·{" "}
              {entities.length}{" "}
              {entities.length === 1 ? "Rechtsträger" : "Rechtsträger"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEntityManagerOpen(true)}>
              <Users /> Rechtsträger
            </Button>
            <Button onClick={openCreate}>
              <Plus /> Immobilie hinzufügen
            </Button>
          </div>
        </div>

        {/* Gesamt-Kennzahlen */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard label="Gesamtwert (Marktwert)" value={formatEuro(totals.totalMarketValueCents)} />
          <KpiCard label="Einkommen / Jahr (Miete)" value={formatEuro(totals.annualRentCents)} />
          <KpiCard label="Kaufpreis gesamt" value={formatEuro(totals.totalPurchaseCents)} />
          <KpiCard label="Restschuld gesamt" value={formatEuro(totals.totalLoanRemainingCents)} />
          <KpiCard label="Gesamtvermögen (Marktwert − Restschuld)" value={formatEuro(netWorthCents)} />
          <KpiCard label="AfA / Jahr" value={formatEuro(totals.annualAfaCents)} />
          <KpiCard
            label="Überschuss / Jahr (vor Steuer)"
            value={formatEuro(totals.annualSurplusCents)}
          />
        </div>

        {/* Diagramme */}
        {!dataLoading && properties.length > 0 && (
          <PortfolioCharts properties={properties} entities={entities} />
        )}

        {/* Gruppen nach Rechtsträger */}
        {dataLoading ? (
          <p className="text-sm text-muted-foreground">Lade Immobilien …</p>
        ) : properties.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-muted-foreground">Noch keine Immobilien erfasst.</p>
              <Button onClick={openCreate}>
                <Plus /> Immobilie hinzufügen
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {groups.map((g) => (
              <Card key={g.entity?.id ?? "orphan"}>
                <CardHeader className="flex-row items-center gap-2 space-y-0">
                  <CardTitle className="text-base">
                    {g.entity ? g.entity.name : "Ohne Rechtsträger"}
                  </CardTitle>
                  {g.entity && (
                    <Badge variant="secondary">{g.entity.legalForm}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {g.props.length}{" "}
                    {g.props.length === 1 ? "Immobilie" : "Immobilien"}
                  </span>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  <PropertyTable
                    props={g.props}
                    transactions={transactions}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <PropertyDialog
        key={dialogOpen ? (editing?.id ?? "new") : "closed"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        property={editing}
        entities={entities}
      />
      <EntityManagerDialog
        open={entityManagerOpen}
        onOpenChange={setEntityManagerOpen}
        entities={entities}
      />
    </main>
  );
}
