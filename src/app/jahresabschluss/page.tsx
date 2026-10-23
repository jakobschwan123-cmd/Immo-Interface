"use client";

// Jahresabschluss: EÜR pro Rechtsträger fuer ein gewaehltes Jahr, mit CSV-Export,
// sowie Anlage V (Entwurf) je Objekt.

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Download, Printer } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import { subscribeProperties } from "@/lib/properties";
import { subscribeEntities } from "@/lib/entities";
import { subscribeAllTransactions } from "@/lib/transactions";
import { computeEuer, availableYears, journalRows, journalTotals, type Euer, type JournalRow } from "@/lib/euer";
import { euerToCsv, journalToCsv, anlageVToCsv, JOURNAL_TYPE_LABEL, downloadTextFile } from "@/lib/csv";
import {
  computeAnlageV,
  ANLAGE_V_QUELLE,
  ANLAGE_V_SUMMEN_ZEILEN,
  ANLAGE_V_ZEILEN_JAHR,
  type AnlageV,
} from "@/lib/anlage-v";
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
function EuerCard({
  title,
  subtitle,
  euer,
  journal,
}: {
  title: string;
  subtitle?: string;
  euer: Euer;
  journal: JournalRow[];
}) {
  const [showJournal, setShowJournal] = useState(false);
  const totals = journalTotals(journal);

  function handleJournalCsv() {
    const safe = title.replace(/[^\p{L}\p{N}_-]+/gu, "_");
    downloadTextFile(`Journal_${euer.year}_${safe}.csv`, journalToCsv(journal, euer.year, title));
    toast.success("Journal-CSV heruntergeladen.");
  }

  function handleCsv() {
    const safe = title.replace(/[^\p{L}\p{N}_-]+/gu, "_");
    downloadTextFile(`EUER_${euer.year}_${safe}.csv`, euerToCsv(euer, title));
    toast.success("CSV heruntergeladen.");
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" className="max-sm:h-10" onClick={() => setShowJournal((v) => !v)}>
            <BookOpen /> Journal
          </Button>
          <Button variant="outline" size="sm" className="max-sm:h-10" onClick={handleCsv}>
            <Download /> CSV
          </Button>
        </div>
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

        {/* Plausibilitaet Darlehenszins (nur Hinweis, nicht in den Summen) */}
        {euer.loanInterestCheck && (
          <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Darlehenszins – Plausibilitätsprüfung</p>
            <p className="mt-1">
              Berechnet (Annuitätenplan):{" "}
              <span className="tabular-nums privacy-blur">
                {formatEuro(euer.loanInterestCheck.calculatedCents)}
              </span>{" "}
              · Gebucht:{" "}
              <span className="tabular-nums privacy-blur">
                {formatEuro(euer.loanInterestCheck.bookedCents)}
              </span>
            </p>
            {Math.abs(euer.loanInterestCheck.diffCents) > 100 ? (
              <p className="mt-1 text-amber-600">
                Abweichung von{" "}
                <span className="tabular-nums privacy-blur">
                  {formatEuro(Math.abs(euer.loanInterestCheck.diffCents))}
                </span>
                . Bitte mit der Jahresbescheinigung der Bank abgleichen. Die EÜR
                verwendet nur die gebuchten Zinsen.
              </p>
            ) : (
              <p className="mt-1">Kein nennenswerter Unterschied.</p>
            )}
          </div>
        )}

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

        {/* Buchungsjournal (Einzelnachweis) – wird mitgedruckt, wenn geoeffnet */}
        {showJournal && (
          <div className="border-t pt-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">Buchungsjournal {euer.year}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleJournalCsv}
                className="max-sm:h-10 print:hidden"
              >
                <Download /> Journal-CSV
              </Button>
            </div>
            {journal.length === 0 ? (
              <p className="text-muted-foreground">Keine Buchungen in diesem Jahr.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[30rem] text-xs sm:min-w-0">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-1 pr-2 font-normal">Datum</th>
                      <th className="py-1 pr-2 font-normal">Immobilie</th>
                      <th className="py-1 pr-2 font-normal">Kategorie</th>
                      <th className="py-1 pr-2 font-normal">Text</th>
                      <th className="py-1 text-right font-normal">Betrag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {journal.map((r) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="py-1 pr-2 whitespace-nowrap">
                          {r.date.split("-").reverse().join(".")}
                        </td>
                        <td className="py-1 pr-2">{r.propertyName}</td>
                        <td className="py-1 pr-2">
                          {r.category}
                          {r.type === "repayment" && (
                            <span className="ml-1 text-muted-foreground">
                              ({JOURNAL_TYPE_LABEL.repayment})
                            </span>
                          )}
                        </td>
                        <td className="py-1 pr-2">{r.description}</td>
                        <td className="py-1 text-right tabular-nums privacy-blur">
                          {r.type === "income" ? "" : "−"}
                          {formatEuro(r.amountCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-muted-foreground">
                  Einnahmen <span className="privacy-blur">{formatEuro(totals.incomeCents)}</span> ·
                  Ausgaben (ohne AfA){" "}
                  <span className="privacy-blur">{formatEuro(totals.expenseCents)}</span> ·
                  Sondertilgungen (nicht in EÜR){" "}
                  <span className="privacy-blur">{formatEuro(totals.repaymentCents)}</span>
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Anlage V (Entwurf) fuer ein Objekt: Bereich <-> Betrag.
function AnlageVCard({ av, subtitle }: { av: AnlageV; subtitle: string }) {
  const z = av.year === ANLAGE_V_ZEILEN_JAHR ? ANLAGE_V_SUMMEN_ZEILEN : undefined;

  function handleCsv() {
    const safe = av.property.name.replace(/[^\p{L}\p{N}_-]+/gu, "_");
    downloadTextFile(`AnlageV_Entwurf_${av.year}_${safe}.csv`, anlageVToCsv(av));
    toast.success("CSV heruntergeladen.");
  }

  const sumRow = (label: string, zeile: string | undefined, cents: number, bold = false) => (
    <tr className={bold ? "border-t-2 font-semibold" : "border-t font-medium"}>
      <td className="py-1 pr-2">{label}</td>
      <td className="py-1 pr-2 whitespace-nowrap">{zeile ?? "–"}</td>
      <td className="py-1 text-right tabular-nums privacy-blur">{formatEuro(cents)}</td>
    </tr>
  );

  return (
    <Card className="break-inside-avoid">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">
            {av.property.name}{" "}
            <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
              Entwurf
            </span>
          </CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <Button variant="outline" size="sm" className="max-sm:h-10 print:hidden" onClick={handleCsv}>
          <Download /> CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {av.hinweise.map((h) => (
          <p key={h} className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
            {h}
          </p>
        ))}
        {av.rows.length === 0 ? (
          <p className="text-muted-foreground">Keine Einnahmen/Werbungskosten in diesem Jahr.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-1 pr-2 font-normal">Bereich (Anlage V)</th>
                <th className="py-1 pr-2 font-normal">Zeile</th>
                <th className="py-1 text-right font-normal">Betrag</th>
              </tr>
            </thead>
            <tbody>
              {(["Einnahmen", "Werbungskosten"] as const).map((art) => (
                <Fragment key={art}>
                  <tr>
                    <td colSpan={3} className="pt-3 pb-1 font-medium">
                      {art}
                    </td>
                  </tr>
                  {av.rows
                    .filter((r) => r.art === art)
                    .map((r) => (
                      <tr key={r.bereich} className="border-b align-top">
                        <td className="py-1 pr-2">
                          <span className={r.zugeordnet ? "" : "font-medium text-rose-600"}>
                            {r.bereich}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            aus: {r.positionen.join(", ")}
                            {r.hinweis && <> · {r.hinweis}</>}
                          </span>
                        </td>
                        <td className="py-1 pr-2 whitespace-nowrap">{r.zeile ?? "–"}</td>
                        <td className="py-1 text-right tabular-nums whitespace-nowrap privacy-blur">
                          {formatEuro(r.amountCents)}
                        </td>
                      </tr>
                    ))}
                </Fragment>
              ))}
              {sumRow("Summe der Einnahmen", z?.einnahmen, av.einnahmenCents)}
              {sumRow("Summe der Werbungskosten", z?.werbungskosten, av.werbungskostenCents)}
              {sumRow("Überschuss", z?.ueberschuss, av.ueberschussCents, true)}
            </tbody>
          </table>
        )}
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
  // "all" = Gesamt je Rechtsträger, sonst ID einer Einzelimmobilie.
  const [scope, setScope] = useState<string>("all");
  const [view, setView] = useState<"euer" | "anlage-v">("euer");

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

  const selectedProperty = properties.find((p) => p.id === scope);
  // Existiert das gewaehlte Objekt nicht mehr (z.B. geloescht), zurueck auf Gesamt.
  const effectiveScope = selectedProperty ? scope : "all";

  return (
    <main className="flex flex-1 flex-col bg-muted/30">
      <AppHeader />

      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Jahresabschluss</h1>
            <p className="text-sm text-muted-foreground">
              {view === "anlage-v"
                ? "Anlage V (Entwurf) je Objekt"
                : `Einnahmen-Überschuss-Rechnung (EÜR) ${selectedProperty ? "je Objekt" : "je Rechtsträger"}`}
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto print:hidden">
            <div className="flex w-full gap-1 rounded-lg bg-muted p-1 sm:w-auto">
              {(
                [
                  ["euer", "EÜR"],
                  ["anlage-v", "Anlage V (Entwurf)"],
                ] as const
              ).map(([v, label]) => (
                <Button
                  key={v}
                  size="sm"
                  variant={view === v ? "default" : "ghost"}
                  className="flex-1 max-sm:h-9 sm:flex-none"
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <Select value={effectiveScope} onValueChange={(v) => setScope(v ?? "all")}>
              <SelectTrigger className="w-full max-sm:h-10! sm:w-auto">
                <SelectValue>
                  {(v: string) =>
                    v === "all"
                      ? "Gesamt (Rechtsträger)"
                      : (properties.find((p) => p.id === v)?.name ?? "Objekt")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Gesamt (Rechtsträger)</SelectItem>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="max-sm:h-10!">
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
            <Button variant="outline" onClick={() => window.print()} className="max-sm:h-10">
              <Printer /> Drucken / PDF
            </Button>
          </div>
        </div>

        {/* Hinweis */}
        <p className="mb-6 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          Vereinfachte Darstellung als Vorbereitung für den Steuerberater – kein
          Steuerberater-Ersatz. Die AfA wird im Kaufjahr monatsgenau angesetzt (Kaufmonat zählt voll, Bestätigung durch den Steuerberater steht noch aus).
        </p>

        {view === "anlage-v" && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <p className="font-semibold">Entwurf – vom Steuerberater zu bestätigen</p>
            <p className="mt-1">
              Die Zuordnung der Kategorien zu den Bereichen der Anlage V ist eine Annahme; die
              Zuordnung des Steuerberaters liegt noch nicht vor. Je Objekt eine Anlage V; Beträge
              entsprechen der EÜR (inkl. AfA, ohne Sondertilgungen). Zeilennummern nur für{" "}
              {ANLAGE_V_ZEILEN_JAHR} geprüft (Quelle: {ANLAGE_V_QUELLE}). „Nicht zugeordnet“ bitte
              mit dem Steuerberater klären.
            </p>
          </div>
        )}

        {properties.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Immobilien/Buchungen vorhanden.
          </p>
        ) : (
          <div className="space-y-6">
            {view === "anlage-v" ? (
              (selectedProperty ? [selectedProperty] : groups.flatMap((g) => g.props)).map((p) => (
                <AnlageVCard
                  key={p.id}
                  av={computeAnlageV(p, transactions, year)}
                  subtitle={`${entityMap.get(p.entityId ?? "")?.name ?? "Ohne Rechtsträger"} · ${p.rentalType} · ${year}`}
                />
              ))
            ) : selectedProperty ? (
              <EuerCard
                title={selectedProperty.name}
                subtitle={`${entityMap.get(selectedProperty.entityId ?? "")?.name ?? "Ohne Rechtsträger"} · ${year}`}
                euer={computeEuer([selectedProperty], transactions, year)}
                journal={journalRows([selectedProperty], transactions, year)}
              />
            ) : (
              groups.map((g) => (
                <EuerCard
                  key={g.key}
                  title={g.title}
                  subtitle={g.subtitle ? `${g.subtitle} · ${year}` : String(year)}
                  euer={computeEuer(g.props, transactions, year)}
                  journal={journalRows(g.props, transactions, year)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
