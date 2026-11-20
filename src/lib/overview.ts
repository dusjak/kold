import type { OversiktConfig } from "@/config/oversikt";
import { formatPercent, instrumentName } from "./format";
import type { LogRow } from "./parse-log";
import { eventName, type Summary, type Trade } from "./summarize";

export type HeroState = "stable" | "gain" | "loss" | "megaloss" | "broke";

export type BotStatus = "kjorer" | "naer" | "pause";

export type BotView = {
  id: string;
  name: string;
  market: string;
  status: BotStatus;
  chip: string;
  openCount: number;
  todayPnl: number;
  totalPnl: number;
  pausedSince: Date | null;
  spark: number[];
  limit: number | null;
  usedKr: number;
  warning: string | null;
};

export type PositionView = {
  id: string;
  bot: string;
  badge: string;
  side: string;
  volume: number | null;
  entry: number | null;
  mark: number | null;
  stop: number | null;
  opened: Date | null;
  profit: number | null;
};

export function heroState(pnl: number, config: OversiktConfig, accountBalance: number | null = null): HeroState {
  if (accountBalance != null && accountBalance <= config.brokeSaldoMaksKr) return "broke";
  const limit = config.dagsgrenseKr;
  if (limit == null || limit === 0) {
    if (pnl > 0) return "gain";
    if (pnl < 0) return "loss";
    return "stable";
  }
  const ratio = pnl / limit;
  if (ratio >= config.gevinstAndel) return "gain";
  if (ratio <= config.megatapAndel) return "megaloss";
  if (ratio < -config.stabilAndel) return "loss";
  return "stable";
}

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function sameDay(a: Date | null, day: string): boolean {
  return a != null && utcDay(a) === day;
}

export function instrumentBadge(symbol: string): string {
  const value = symbol.toUpperCase();
  if (value.includes("XAU") || value === "GOLD") return "GOLD";
  return value || "UKJENT";
}

function marketLine(symbol: string): string {
  const name = instrumentName(symbol);
  if (!symbol) return name ?? "Ukjent";
  return name ? `${symbol} · ${name}` : symbol;
}

function chipFor(status: BotStatus, openSides: string[]): string {
  if (status === "pause") return "■  På pause";
  if (status === "naer") return "●  Nær dagsgrensen";
  if (openSides.length > 0 && openSides.every((side) => side === "buy")) return "●  Kjøper";
  if (openSides.length > 0 && openSides.every((side) => side === "sell")) return "●  Selger";
  return "●  Kjører";
}

export function buildBots(summary: Summary, rows: LogRow[], config: OversiktConfig, anchor: Date): BotView[] {
  const day = utcDay(anchor);
  const groups = new Map<string, { trades: Trade[]; deinit: Date | null }>();

  const ensure = (id: string) => {
    const existing = groups.get(id);
    if (existing) return existing;
    const created = { trades: [] as Trade[], deinit: null as Date | null };
    groups.set(id, created);
    return created;
  };

  for (const trade of summary.trades) {
    const id = trade.comment.trim() || trade.symbol || "Logg";
    ensure(id).trades.push(trade);
  }

  for (const row of rows) {
    if (eventName(row.event) !== "DEINIT" || !row.time) continue;
    const id = row.comment.trim() || row.symbol || "Logg";
    const group = ensure(id);
    if (!group.deinit || row.time > group.deinit) group.deinit = row.time;
  }

  const limit = config.dagsgrenseKr;

  return [...groups.entries()]
    .map(([id, group]) => {
      const open = group.trades.filter((trade) => trade.status === "open");
      const closed = group.trades.filter((trade) => trade.status === "closed" && trade.profit != null);
      const todayPnl = closed
        .filter((trade) => sameDay(trade.closeTime, day))
        .reduce((sum, trade) => sum + (trade.profit ?? 0), 0);
      const totalPnl = closed.reduce((sum, trade) => sum + (trade.profit ?? 0), 0);
      const usedKr = Math.max(0, -todayPnl);
      const near = limit != null && limit > 0 && usedKr / limit >= config.naerGrense;
      const status: BotStatus = open.length > 0 ? (near ? "naer" : "kjorer") : "pause";
      let cumulative = 0;
      const spark = closed
        .filter((trade) => trade.closeTime)
        .sort((a, b) => a.closeTime!.getTime() - b.closeTime!.getTime())
        .map((trade) => {
          cumulative += trade.profit ?? 0;
          return cumulative;
        });
      const symbol = open[0]?.symbol || group.trades[0]?.symbol || "";
      return {
        id,
        name: id,
        market: marketLine(symbol),
        status,
        chip: chipFor(status, open.map((trade) => trade.side)),
        openCount: open.length,
        todayPnl,
        totalPnl,
        pausedSince: status === "pause" ? group.deinit : null,
        spark,
        limit: status === "pause" ? null : limit,
        usedKr,
        warning:
          status === "naer" && limit ? `${formatPercent(usedKr / limit, 0)} av dagsgrensen brukt.` : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "nb"));
}

export function buildPositions(summary: Summary): PositionView[] {
  return summary.openTrades
    .slice()
    .sort((a, b) => (b.openTime?.getTime() ?? 0) - (a.openTime?.getTime() ?? 0))
    .map((trade) => ({
      id: `${trade.ticket}-${trade.openTime?.toISOString() ?? ""}`,
      bot: trade.comment || trade.symbol || "Logg",
      badge: instrumentBadge(trade.symbol),
      side: trade.side,
      volume: trade.volume,
      entry: trade.openPrice,
      mark: null,
      stop: trade.sl,
      opened: trade.openTime,
      profit: trade.profit,
    }));
}

export function runningLabel(bots: BotView[]): string {
  const total = bots.length;
  const running = bots.filter((bot) => bot.status !== "pause").length;
  if (total === 0) return "Ingen boter i loggen.";
  return `${running} av ${total} kjører`;
}

export function heroStatus(state: HeroState, bots: BotView[]): string {
  if (state === "broke") return "Ingenting igjen å trade for.";
  if (state === "megaloss") return "Vi foreslår å stoppe boten.";
  if (state === "loss") return "Innenfor tapsgrensen. Planen står.";
  if (state === "stable") return "Dagen holder seg innenfor rammen.";
  const total = bots.length;
  const running = bots.filter((bot) => bot.status !== "pause").length;
  if (total === 0) return "Ingen boter i loggen.";
  if (running === 1 && total === 1) return "1 bot handler nå. Du holder planen.";
  return `${running} av ${total} boter handler nå. Du holder planen.`;
}

export function periodPnl(summary: Summary, anchor: Date, rangeMs: number): number {
  const start = anchor.getTime() - rangeMs;
  return summary.closedTrades
    .filter((trade) => trade.closeTime && trade.profit != null)
    .filter((trade) => {
      const time = trade.closeTime!.getTime();
      return time >= start && time <= anchor.getTime();
    })
    .reduce((sum, trade) => sum + (trade.profit ?? 0), 0);
}

export function openResult(positions: PositionView[]): number | null {
  if (positions.length === 0) return null;
  if (positions.some((position) => position.profit == null)) return null;
  return positions.reduce((sum, position) => sum + (position.profit ?? 0), 0);
}

