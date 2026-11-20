"use client";

import { oversiktConfig } from "@/config/oversikt";
import type { PnlPoint } from "@/lib/summarize";

const W = 600;
const H = 180;
const PAD = 6;

export function HeroChart({ points }: { points: PnlPoint[] }) {
  const reference = oversiktConfig.referanseKontoKr;
  const asPercent = reference != null && reference !== 0;
  const series = points.map((point) => ({
    time: point.time,
    value: asPercent ? (point.value / reference) * 100 : point.value,
  }));

  if (series.length === 0) {
    return <p className="tom">Ingen lukkede handler i dette intervallet.</p>;
  }

  const values = series.map((point) => point.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const min = lo - span * 0.12;
  const max = hi + span * 0.12;
  const t0 = series[0].time.getTime();
  const t1 = series[series.length - 1].time.getTime();
  const plotW = W - PAD * 2;
  const plotH = H - PAD * 2;
  const xFor = (time: number) => (t1 === t0 ? W / 2 : PAD + ((time - t0) / (t1 - t0)) * plotW);
  const yFor = (value: number) => PAD + ((max - value) / (max - min)) * plotH;
  const line = series.map((point) => `${xFor(point.time.getTime()).toFixed(1)},${yFor(point.value).toFixed(1)}`).join(" ");

  return (
    <svg className="plot-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Utvikling">
      <polyline points={line} fill="none" stroke="var(--result-graph)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function Sparkline({ values, tone }: { values: number[]; tone: "gevinst" | "tap" | "dempet" }) {
  if (values.length < 2) return <span className="spark" aria-hidden="true" />;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 122;
      const y = 4 + ((hi - value) / span) * 26;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const stroke = tone === "gevinst" ? "var(--kold-data-gain)" : tone === "tap" ? "var(--kold-data-loss)" : "var(--kold-border-separator-strong)";
  return (
    <span className="spark" aria-hidden="true">
      <svg viewBox="0 0 122 34">
        <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </span>
  );
}
