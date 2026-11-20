import type { LogRow } from "./parse-log";

export type Trade = {
  ticket: string;
  symbol: string;
  side: string;
  volume: number | null;
  openTime: Date | null;
  openPrice: number | null;
  closeTime: Date | null;
  closePrice: number | null;
  profit: number | null;
  sl: number | null;
  tp: number | null;
  comment: string;
  magic: number | null;
  status: "open" | "closed";
};

export type PnlPoint = {
  time: Date;
  value: number;
  profit: number;
};

export type SkipCount = {
  reason: string;
  count: number;
};

export type Summary = {
  trades: Trade[];
  openTrades: Trade[];
  closedTrades: Trade[];
  pnl: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number | null;
  tradeCount: number;
  skips: SkipCount[];
  skipCount: number;
  errors: LogRow[];
  approvedCount: number;
  pnlSeries: PnlPoint[];
  firstTime: Date | null;
  lastTime: Date | null;
};

export type RangeKey = "1d" | "1u" | "1m" | "3m" | "1y";

const RANGE_MS: Record<RangeKey, number> = {
  "1d": 86_400_000,
  "1u": 7 * 86_400_000,
  "1m": 30 * 86_400_000,
  "3m": 90 * 86_400_000,
  "1y": 365 * 86_400_000,
};

export function eventName(event: string): string {
  return event.trim().toUpperCase();
}

export function isOpenEvent(event: string): boolean {
  return eventName(event) === "OPEN";
}

export function isCloseEvent(event: string): boolean {
  const name = eventName(event);
  return name === "CLOSE" || name === "CLOSED" || name.startsWith("CLOSE_");
}

export function isSkipEvent(event: string): boolean {
  const name = eventName(event);
  return name === "SKIP" || name.startsWith("SKIP_");
}

export function isSendError(event: string): boolean {
  const name = eventName(event);
  return name === "SEND_ERROR" || name.startsWith("SEND_ERROR_");
}

export function skipKey(row: LogRow): string {
  const name = eventName(row.event);
  if (name.startsWith("SKIP_") && name.length > 5) return name.slice(5);
  if (row.reason.trim()) return row.reason.trim();
  return name || "UKJENT";
}

export function normalizeSide(side: string): string {
  const value = side.trim().toLowerCase();
  if (value === "buy" || value === "0" || value === "long" || value === "kjøp" || value === "kjop") {
    return "buy";
  }
  if (value === "sell" || value === "1" || value === "short" || value === "salg") {
    return "sell";
  }
  return side.trim();
}

function sortRows(rows: LogRow[]): LogRow[] {
  return rows
    .map((row, order) => ({ row, order }))
    .sort((a, b) => {
      const aTime = a.row.time?.getTime();
      const bTime = b.row.time?.getTime();
      if (aTime != null && bTime != null && aTime !== bTime) return aTime - bTime;
      if (aTime != null && bTime == null) return -1;
      if (aTime == null && bTime != null) return 1;
      return a.order - b.order;
    })
    .map((item) => item.row);
}

function newTrade(row: LogRow, status: "open" | "closed"): Trade {
  return {
    ticket: row.ticket,
    symbol: row.symbol,
    side: normalizeSide(row.side),
    volume: row.volume,
    openTime: status === "open" ? row.time : null,
    openPrice: status === "open" ? row.price : null,
    closeTime: status === "closed" ? row.time : null,
    closePrice: status === "closed" ? row.price : null,
    profit: status === "closed" ? row.profit : null,
    sl: row.sl,
    tp: row.tp,
    comment: row.comment,
    magic: row.magic,
    status,
  };
}

export function summarize(rows: LogRow[]): Summary {
  const sorted = sortRows(rows);
  const trades: Trade[] = [];
  const openByTicket = new Map<string, Trade>();

  for (const row of sorted) {
    if (isOpenEvent(row.event)) {
      const trade = newTrade(row, "open");
      trades.push(trade);
      if (row.ticket) openByTicket.set(row.ticket, trade);
      continue;
    }
    if (!isCloseEvent(row.event)) continue;

    let trade = row.ticket ? openByTicket.get(row.ticket) : undefined;
    if (trade && trade.status === "closed") trade = undefined;
    if (!trade) {
      const open = trades.filter(
        (item) => item.status === "open" && (!row.symbol || item.symbol === row.symbol),
      );
      trade = open[open.length - 1];
    }
    if (!trade) {
      trade = newTrade(row, "closed");
      trades.push(trade);
    } else {
      trade.status = "closed";
      trade.closeTime = row.time;
      trade.closePrice = row.price;
      trade.profit = row.profit;
      if (!trade.side && row.side) trade.side = normalizeSide(row.side);
      if (trade.volume == null) trade.volume = row.volume;
      if (trade.sl == null) trade.sl = row.sl;
      if (trade.tp == null) trade.tp = row.tp;
    }
    if (row.ticket) openByTicket.set(row.ticket, trade);
  }

  const openTrades = trades.filter((trade) => trade.status === "open");
  const closedTrades = trades.filter((trade) => trade.status === "closed");
  const decided = closedTrades.filter((trade) => trade.profit != null);
  const wins = decided.filter((trade) => (trade.profit ?? 0) > 0).length;
  const losses = decided.filter((trade) => (trade.profit ?? 0) < 0).length;
  const breakeven = decided.filter((trade) => trade.profit === 0).length;
  const pnl = decided.reduce((sum, trade) => sum + (trade.profit ?? 0), 0);

  let cumulative = 0;
  const pnlSeries: PnlPoint[] = decided
    .filter((trade) => trade.closeTime)
    .sort((a, b) => a.closeTime!.getTime() - b.closeTime!.getTime())
    .map((trade) => {
      cumulative += trade.profit ?? 0;
      return { time: trade.closeTime!, value: cumulative, profit: trade.profit ?? 0 };
    });

  const skipCounts = new Map<string, number>();
  for (const row of sorted) {
    if (!isSkipEvent(row.event)) continue;
    const key = skipKey(row);
    skipCounts.set(key, (skipCounts.get(key) ?? 0) + 1);
  }
  const skips = [...skipCounts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason, "nb"));

  const times = sorted.map((row) => row.time).filter((time): time is Date => time != null);

  return {
    trades,
    openTrades,
    closedTrades,
    pnl,
    wins,
    losses,
    breakeven,
    winRate: decided.length ? wins / decided.length : null,
    tradeCount: trades.length,
    skips,
    skipCount: skips.reduce((sum, item) => sum + item.count, 0),
    errors: sorted.filter((row) => isSendError(row.event)),
    approvedCount: sorted.filter((row) => eventName(row.event) === "APPROVED").length,
    pnlSeries,
    firstTime: times[0] ?? null,
    lastTime: times[times.length - 1] ?? null,
  };
}

export function seriesInRange(series: PnlPoint[], end: Date | null, range: RangeKey): PnlPoint[] {
  if (!end) return series;
  const start = end.getTime() - RANGE_MS[range];
  let cumulative = 0;
  return series
    .filter((point) => point.time.getTime() >= start && point.time.getTime() <= end.getTime())
    .map((point) => {
      cumulative += point.profit;
      return { ...point, value: cumulative };
    });
}
