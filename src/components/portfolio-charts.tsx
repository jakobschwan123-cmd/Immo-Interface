"use client";

// Einfache, abhaengigkeitsfreie Diagramme fuer den Gesamt-Überblick:
// 1) Wert-Verteilung nach Rechtsträger (horizontale Balken)
// 2) Einnahmen / Kosten / AfA / Überschuss pro Jahr

import { sumKpis } from "@/lib/finance";
import { formatEuro } from "@/lib/money";
import type { Property, Entity } from "@/lib/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Farbpalette fuer die Rechtsträger-Balken (der Reihe nach).
const COLORS = [
  "bg-sky-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-slate-400",
];

// Wert einer Immobilie fuer die Verteilung: Marktwert, sonst Kaufpreis.
function propertyValue(p: Property): number {
  return p.marketValueCents ?? p.purchasePriceCents;
}

export function PortfolioCharts({
  properties,
  entities,
}: {
  properties: Property[];
  entities: Entity[];
}) {
  if (properties.length === 0) return null;

  // --- Diagramm 1: Wert je Rechtsträger ---
  const entityMap = new Map(entities.map((e) => [e.id, e]));
  const buckets: { label: string; value: number }[] = [];
  for (const e of entities) {
    const value = properties
      .filter((p) => p.entityId === e.id)
      .reduce((s, p) => s + propertyValue(p), 0);
    if (value > 0) buckets.push({ label: e.name, value });
  }
  const orphanValue = properties
    .filter((p) => !p.entityId || !entityMap.has(p.entityId))
    .reduce((s, p) => s + propertyValue(p), 0);
  if (orphanValue > 0) buckets.push({ label: "Ohne Rechtsträger", value: orphanValue });

  buckets.sort((a, b) => b.value - a.value);
  const totalValue = buckets.reduce((s, b) => s + b.value, 0);

  // --- Diagramm 2: Jahreszahlen ---
  const totals = sumKpis(properties);
  const flows = [
    { label: "Mieteinnahmen", value: totals.annualRentCents, color: "bg-emerald-500" },
    { label: "Kosten", value: totals.annualCostsCents, color: "bg-rose-500" },
    { label: "AfA", value: totals.annualAfaCents, color: "bg-amber-500" },
    { label: "Überschuss", value: totals.annualSurplusCents, color: "bg-sky-500" },
  ];
  const maxFlow = Math.max(1, ...flows.map((f) => Math.abs(f.value)));

  return (
    <div className="mb-8 grid gap-6 lg:grid-cols-2">
      {/* Verteilung nach Rechtsträger */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Wert nach Rechtsträger</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {buckets.map((b, i) => {
            const share = totalValue > 0 ? (b.value / totalValue) * 100 : 0;
            return (
              <div key={b.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="truncate">{b.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatEuro(b.value)} · {share.toFixed(0)} %
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${COLORS[i % COLORS.length]}`}
                    style={{ width: `${share}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Einnahmen / Kosten / AfA / Überschuss pro Jahr */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pro Jahr</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {flows.map((f) => {
            const width = (Math.abs(f.value) / maxFlow) * 100;
            const negative = f.value < 0;
            return (
              <div key={f.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{f.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatEuro(f.value)}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${negative ? "bg-red-600" : f.color}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
