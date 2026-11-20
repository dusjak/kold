"use client";

import { oversiktConfig } from "@/config/oversikt";
import type { PnlPoint } from "@/lib/summarize";

const W = 760;
const H = 220;
const PAD_L = 4;
const PAD_R = 8;
const PAD_T = 12;
const PAD_B = 8;

function axis(values: number[]) {
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  const span = hi - lo || 1;
  const rough = span / 3;
  const mag = 10 ** Math.floor(Math.log10(Math.abs(rough) || 1));
  const normalized = rough / mag;
  const step = normalized <= 1 ? mag : normalized <= 2 ? 2 * mag : normalized <= 5 ? 5 * mag : 10 * mag;
  const min = Math.floor(lo / step) * step;
  const max = Math.max(Math.ceil((hi === 0 ? step : hi) / step) * step, min + step);
  const count = Math.max(1, Math.round((max - min) / step));
  const ticks = Array.from({ length: count + 1 }, (_, index) => Math.round((min + index * step) * 1e6) / 1e6);
  return { min, max, ticks };
}

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

  const scale = axis(series.map((point) => point.value));
  const t0 = series[0].time.getTime();
  const t1 = series[series.length - 1].time.getTime();
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const xFor = (time: number) => (t1 === t0 ? PAD_L + plotW / 2 : PAD_L + ((time - t0) / (t1 - t0)) * plotW);
  const yFor = (value: number) => PAD_T + ((scale.max - value) / (scale.max - scale.min || 1)) * plotH;
  const line = series.map((point) => `${xFor(point.time.getTime()).toFixed(1)},${yFor(point.value).toFixed(1)}`).join(" ");
  const last = series[series.length - 1];

  return (
    <svg className="plot-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Utvikling">
      {scale.ticks.map((tick) => {
        const y = yFor(tick);
        return (
          <g key={tick}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="var(--result-graph)" strokeOpacity="0.16" strokeWidth="1" />
          </g>
        );
      })}
      <polyline points={line} fill="none" stroke="var(--result-graph)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={xFor(last.time.getTime())} cy={yFor(last.value)} r="3.5" fill="var(--result-graph)" />
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
