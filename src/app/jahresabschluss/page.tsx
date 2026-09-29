"use client";

// Jahresabschluss: EÜR pro Rechtsträger fuer ein gewaehltes Jahr, mit CSV-Export.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import { subscribeProperties } from "@/lib/properties";
import { subscribeEntities } from "@/lib/entities";
import { subscribeAllTransactions } from "@/lib/transactions";
import { computeEuer, availableYears, type Euer } from "@/lib/euer";
import { euerToCsv, downloadTextFile } from "@/lib/csv";
import { formatEuro } from "@/lib/money";
import type { Property, Entity, Transaction } from "@/lib/types";

import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Eine EÜR-Karte fuer einen Rechtsträger.
function EuerCard({ title, subtitle, euer }: { title: string; subtitle?: string; euer: Euer }) {
  function handleCsv() {
    const safe = title.replace(/[^\p{L}\p{N}_-]+/gu, "_");
    downloadTextFile(`EUER_${euer.year}_${safe}.csv`, euerToCsv(euer, title));
    toast.success("CSV heruntergeladen.");
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleCsv} className="print:hidden">
          <Download /> CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* Einnahmen */}
        <div>
          <p className="mb-1 font-medium">Einnahmen</p>
          {euer.income.length === 0 ? (
            <p className="text-muted-foreground">Keine Einnahmen erfasst.</p>
          ) : (
            euer.income.map((l) => (
              <div key={l.label} className="flex justify-between py-0.5">
                <span className="text-muted-foreground">{l.label}</span>
                <span className="tabular-nums privacy-blur">{formatEuro(l.amountCents)}</span>
              </div>
            ))
          )}
          <div className="mt-1 flex justify-between border-t pt-1 font-medium">
            <span>Summe Einnahmen</span>
            <span className="tabular-nums privacy-blur">{formatEuro(euer.incomeTotalCents)}</span>
          </div>
        </div>

        {/* Ausgaben */}
        <div>
          <p className="mb-1 font-medium">Ausgaben</p>
          {euer.expenses.length === 0 ? (
            <p className="text-muted-foreground">Keine Ausgaben erfasst.</p>
          ) : (
            euer.expenses.map((l) => (
              <div key={l.label} className="flex justify-between py-0.5">
                <span className="text-muted-foreground">{l.label}</span>
                <span className="tabular-nums privacy-blur">{formatEuro(l.amountCents)}</span>
              </div>
            ))
          )}
          <div className="mt-1 flex justify-between border-t pt-1 font-medium">
            <span>Summe Ausgaben</span>
            <span className="tabular-nums privacy-blur">{formatEuro(euer.expenseTotalCents)}</span>
          </div>
        </div>

        {/* Ergebnis */}
        <div className="flex justify-between border-t-2 pt-2 text-base font-semibold">
          <span>{euer.surplusCents >= 0 ? "Überschuss" : "Verlust"}</span>
          <span
            className={`tabular-nums privacy-blur ${
              euer.surplusCents >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {formatEuro(euer.surplusCents)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Jahresabschluss() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [properties, setProperties] = useState<Property[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const u1 = subscribeProperties(setProperties, (e) =>
      console.error("[Properties]", e),
    );
    const u2 = subscribeEntities(setEntities, (e) =>
      console.error("[Entities]", e),
    );
    const u3 = subscribeAllTransactions(setTransactions, (e) =>
      console.error("[Transactions]", e),
    );
    return () => {
      u1();
      u2();
      u3();
    };
  }, [user]);

  if (loading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Lade …</p>
      </main>
    );
  }

  const years = availableYears(transactions);

  // Gruppen nach Rechtsträger (wie im Dashboard).
  const entityMap = new Map(entities.map((e) => [e.id, e]));
  const groups: { key: string; title: string; subtitle?: string; props: Property[] }[] = [];
  for (const e of entities) {
    const props = properties.filter((p) => p.entityId === e.id);
    if (props.length) groups.push({ key: e.id, title: e.name, subtitle: e.legalForm, props });
  }
  const orphan = properties.filter((p) => !p.entityId || !entityMap.has(p.entityId));
  if (orphan.length)
    groups.push({ key: "orphan", title: "Ohne Rechtsträger", props: orphan });

  return (
    <main className="flex flex-1 flex-col bg-muted/30">
      <AppHeader />

      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Jahresabschluss</h1>
            <p className="text-sm text-muted-foreground">
              Einnahmen-Überschuss-Rechnung (EÜR) je Rechtsträger
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer /> Drucken / PDF
            </Button>
          </div>
        </div>

        {/* Hinweis */}
        <p className="mb-6 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          Vereinfachte Darstellung als Vorbereitung für den Steuerberater – kein
          Steuerberater-Ersatz. Die AfA wird als voller Jahresbetrag angesetzt.
        </p>

        {properties.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Immobilien/Buchungen vorhanden.
          </p>
        ) : (
          <div className="space-y-6">
            {groups.map((g) => (
              <EuerCard
                key={g.key}
                title={g.title}
                subtitle={g.subtitle ? `${g.subtitle} · ${year}` : String(year)}
                euer={computeEuer(g.props, transactions, year)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
