/** Tynt mellomrom, slik hovedbok-reglene i hi-fi beskriver tall. */
export const THIN = "\u202f";
/** Hardt mellomrom foran enhet. */
export const NBSP = "\u00a0";
/** Ekte minus, ikke bindestrek. */
export const MINUS = "\u2212";

const MONTHS = [
  "jan.",
  "feb.",
  "mars",
  "apr.",
  "mai",
  "juni",
  "juli",
  "aug.",
  "sep.",
  "okt.",
  "nov.",
  "des.",
];

function group(whole: string): string {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, THIN);
}

export function formatNumber(value: number, decimals = 2): string {
  const negative = value < 0;
  const [whole, frac] = Math.abs(value).toFixed(decimals).split(".");
  const body = decimals > 0 ? `${group(whole)},${frac}` : group(whole);
  return negative ? `${MINUS}${body}` : body;
}

export function formatSignedNumber(value: number, decimals = 2): string {
  if (value > 0) return `+${formatNumber(value, decimals)}`;
  return formatNumber(value, decimals);
}

export function formatMoney(value: number, signed = true): string {
  const amount = signed ? formatSignedNumber(value, 2) : formatNumber(value, 2);
  return `${amount}${NBSP}kr`;
}

export function formatPercent(ratio: number, decimals = 1): string {
  return `${formatNumber(ratio * 100, decimals)}${NBSP}%`;
}

export function formatLogDate(date: Date): string {
  return `${date.getUTCDate()}. ${MONTHS[date.getUTCMonth()]}`;
}

export function formatLogDateTime(date: Date): string {
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${formatLogDate(date)} ${hh}:${mm}`;
}

export function monthLabel(date: Date): string {
  return MONTHS[date.getUTCMonth()];
}

export function greeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 5 || hour >= 22) return "God natt";
  if (hour < 10) return "God morgen";
  if (hour < 17) return "God dag";
  return "God kveld";
}

const SKIP_LABELS: Record<string, string> = {
  SPREAD: "Spread",
  SESSION: "Sesjon",
  MARGIN: "Margin",
  MAXPOS: "Maks antall",
};

export function skipLabel(reason: string): string {
  if (SKIP_LABELS[reason]) return SKIP_LABELS[reason];
  const lower = reason.replace(/_/g, " ").trim().toLowerCase();
  if (!lower) return "Ukjent";
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function sideLabel(side: string): string {
  if (side === "buy") return "Kjøp";
  if (side === "sell") return "Salg";
  return side || "Ukjent";
}

export function instrumentName(symbol: string): string | null {
  const value = symbol.toUpperCase();
  if (value.includes("XAU") || value === "GOLD") return "Gull";
  return null;
}
