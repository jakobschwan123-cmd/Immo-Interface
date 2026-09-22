"use client";

// Kennzahl-Karte mit kleinem Flächen-Diagramm (Area-Sparkline).
// Abhängigkeitsfrei (inline SVG). data = Werte je Monat (in Cent).

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StatCardArea({
  label,
  value,
  data,
  caption,
}: {
  label: string;
  value: string;
  data: number[]; // z.B. 12 Monatswerte
  caption?: string;
}) {
  const W = 100;
  const H = 32;
  const n = data.length;
  const max = Math.max(1, ...data);

  // Punkte auf die Fläche mappen (y invertiert, oben = großer Wert).
  const points = data.map((d, i) => {
    const x = n <= 1 ? 0 : (i / (n - 1)) * W;
    const y = H - (d / max) * H;
    return [x, y] as const;
  });

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)} ${p[1].toFixed(2)}`)
    .join(" ");
  const area = points.length
    ? `${line} L ${W} ${H} L 0 ${H} Z`
    : "";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums privacy-blur">{value}</p>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="mt-2 h-10 w-full privacy-blur"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          {area && <path d={area} fill="url(#areaFill)" />}
          {line && (
            <path
              d={line}
              fill="none"
              stroke="#10b981"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
          )}
        </svg>
        {caption && (
          <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
        )}
      </CardContent>
    </Card>
  );
}
