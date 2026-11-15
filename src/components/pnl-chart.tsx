"use client";

import { formatMoney, formatSignedNumber, monthLabel } from "@/lib/format";
import type { PnlPoint } from "@/lib/summarize";

const W = 680;
const H = 222;
const PAD_L = 72;
const PAD_R = 18;
const PAD_T = 14;
const PAD_B = 28;

function axisFor(values: number[]) {
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  const span = hi - lo || 1;
  const rough = span / 4;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / mag;
  const step =
    normalized <= 1 ? mag : normalized <= 2 ? 2 * mag : normalized <= 2.5 ? 2.5 * mag : normalized <= 5 ? 5 * mag : 10 * mag;
  const min = Math.floor(lo / step) * step;
  const max = Math.max(Math.ceil((hi === 0 ? step : hi) / step) * step, min + step);
  const count = Math.round((max - min) / step);
  const ticks = Array.from({ length: count + 1 }, (_, index) =>
    Math.round((min + index * step) * 1e6) / 1e6,
  );
  return { min, max, ticks, step };
}

function formatAxis(value: number, step: number): string {
  const decimals = step < 1 ? 2 : Number.isInteger(step) ? 0 : 1;
  return formatSignedNumber(value, decimals);
}

export function PnlChart({ points }: { points: PnlPoint[] }) {
  if (points.length === 0) {
    return <p className="empty">Ingen lukkede handler i dette intervallet.</p>;
  }

  const axis = axisFor(points.map((point) => point.value));
  const t0 = points[0].time.getTime();
  const t1 = points[points.length - 1].time.getTime();
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const xFor = (time: number) => (t1 === t0 ? PAD_L + plotW / 2 : PAD_L + ((time - t0) / (t1 - t0)) * plotW);
  const yFor = (value: number) => PAD_T + ((axis.max - value) / (axis.max - axis.min || 1)) * plotH;

  const line = points
    .map((point) => `${xFor(point.time.getTime()).toFixed(1)},${yFor(point.value).toFixed(1)}`)
    .join(" ");
  const last = points[points.length - 1];

  const months: { x: number; label: string }[] = [];
  let year = points[0].time.getUTCFullYear();
  let month = points[0].time.getUTCMonth();
  const endYear = points[points.length - 1].time.getUTCFullYear();
  const endMonth = points[points.length - 1].time.getUTCMonth();
  while (year < endYear || (year === endYear && month <= endMonth)) {
    const stamp = Date.UTC(year, month, 1);
    months.push({
      x: xFor(Math.min(Math.max(stamp, t0), t1)),
      label: monthLabel(new Date(Date.UTC(year, month, 1))),
    });
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  const labels = months.filter((item, index) => {
    if (index === 0) return true;
    const previous = months[index - 1];
    return item.x - previous.x > 56;
  });

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Utvikling, slutt på ${formatMoney(last.value)}`}
    >
      {axis.ticks.map((tick) => {
        const y = yFor(tick);
        return (
          <g key={tick}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="var(--grid)" strokeWidth="1" />
            <text
              x={PAD_L - 8}
              y={y + 4}
              textAnchor="end"
              fill="var(--axis)"
              style={{ fontFamily: "var(--font-num)", fontSize: 11 }}
            >
              {formatAxis(tick, axis.step)}
            </text>
          </g>
        );
      })}
      {labels.map((item, index) => (
        <text
          key={`${item.label}-${index}`}
          x={item.x}
          y={H - 8}
          textAnchor={index === 0 ? "start" : index === labels.length - 1 ? "end" : "middle"}
          fill="var(--axis)"
          style={{ fontFamily: "var(--font-ui)", fontSize: 11 }}
        >
          {item.label}
        </text>
      ))}
      <polyline
        points={line}
        fill="none"
        stroke="var(--series-1)"
        strokeWidth="2.25"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={xFor(last.time.getTime())} cy={yFor(last.value)} r="4" fill="var(--series-1)" />
    </svg>
  );
}
