"use client";

// Dashboard: Uebersicht aller Immobilien mit Kennzahlen.
// Liest die Daten in Echtzeit aus Firestore (nur fuer eingeloggte, freigeschaltete Nutzer).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import { subscribeProperties, deleteProperty } from "@/lib/properties";
import { calculateKpis, sumKpis } from "@/lib/finance";
import { formatEuro, formatPercent } from "@/lib/money";
import type { Property } from "@/lib/types";

import { AppHeader } from "@/components/app-header";
import { PropertyDialog } from "@/components/property-dialog";
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

// Eine kleine Kennzahl-Kachel fuer die obere Uebersicht.
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

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [properties, setProperties] = useState<Property[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Dialog-Steuerung: editing = null -> Anlegen, editing = Property -> Bearbeiten.
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(p: Property) {
    setEditing(p);
    setDialogOpen(true);
  }

  // Nicht eingeloggte Nutzer zur Login-Seite schicken.
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // Echtzeit-Abo auf die Immobilien, solange ein Nutzer eingeloggt ist.
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeProperties(
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
    return () => unsubscribe();
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

  const totals = sumKpis(properties);

  return (
    <main className="flex flex-1 flex-col bg-muted/30">
      <AppHeader />

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {/* Titelzeile mit Aktion */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Übersicht</h1>
            <p className="text-sm text-muted-foreground">
              {properties.length}{" "}
              {properties.length === 1 ? "Immobilie" : "Immobilien"}
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus /> Immobilie hinzufügen
          </Button>
        </div>

        {/* Kennzahlen-Kacheln */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Kaufpreis gesamt"
            value={formatEuro(totals.totalPurchaseCents)}
          />
          <KpiCard
            label="Marktwert gesamt"
            value={formatEuro(totals.totalMarketValueCents)}
          />
          <KpiCard
            label="Mieteinnahmen / Jahr"
            value={formatEuro(totals.annualRentCents)}
          />
          <KpiCard
            label="Überschuss / Jahr (vor Steuer)"
            value={formatEuro(totals.annualSurplusCents)}
          />
        </div>

        {/* Immobilien-Tabelle */}
        {dataLoading ? (
          <p className="text-sm text-muted-foreground">Lade Immobilien …</p>
        ) : properties.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-muted-foreground">
                Noch keine Immobilien erfasst.
              </p>
              <Button onClick={openCreate}>
                <Plus /> Immobilie hinzufügen
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Objekt</TableHead>
                    <TableHead>Rechtsform</TableHead>
                    <TableHead className="text-right">Kaufpreis</TableHead>
                    <TableHead className="text-right">Miete / Monat</TableHead>
                    <TableHead className="text-right">Rendite (brutto)</TableHead>
                    <TableHead className="text-right">AfA / Jahr</TableHead>
                    <TableHead className="text-right">Überschuss / Jahr</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.map((p) => {
                    const k = calculateKpis(p);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/immobilie/${p.id}`}
                            className="hover:underline"
                          >
                            {p.name}
                          </Link>
                          {p.address && (
                            <span className="block text-xs text-muted-foreground">
                              {p.address}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{p.legalForm}</Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatEuro(p.purchasePriceCents)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatEuro(p.monthlyRentCents)}
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
                              onClick={() => openEdit(p)}
                              aria-label="Bearbeiten"
                            >
                              <Pencil className="text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(p)}
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
              </Table>
            </div>
          </Card>
        )}
      </div>

      {/* Ein Dialog fuer Anlegen UND Bearbeiten.
          Der key sorgt dafuer, dass die Formularfelder bei jedem Oeffnen frisch
          aus der gewaehlten Immobilie (bzw. leer) initialisiert werden. */}
      <PropertyDialog
        key={dialogOpen ? (editing?.id ?? "new") : "closed"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        property={editing}
      />
    </main>
  );
}
