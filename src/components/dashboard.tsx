"use client";

import { useMemo, useRef, useState } from "react";
import {
  formatLogDateTime,
  formatMoney,
  formatNumber,
  formatPercent,
  greeting,
  instrumentName,
  sideLabel,
  skipLabel,
} from "@/lib/format";
import type { LoadedLog } from "@/lib/load-log";
import { parseLogs } from "@/lib/parse-log";
import type { LogRow } from "@/lib/parse-log";
import { seriesInRange, summarize } from "@/lib/summarize";
import type { RangeKey, Trade } from "@/lib/summarize";
import { Logo } from "./logo";
import { PnlChart } from "./pnl-chart";
import { ThemeToggle } from "./theme-toggle";

type LogKind = LoadedLog["kind"] | "upload";

const RANGES: { id: RangeKey; label: string }[] = [
  { id: "1d", label: "1d" },
  { id: "1u", label: "1u" },
  { id: "1m", label: "1 mnd" },
  { id: "3m", label: "3 mnd" },
  { id: "1y", label: "1 år" },
];

function noun(count: number, one: string, many: string): string {
  return `${formatNumber(count, 0)} ${count === 1 ? one : many}`;
}

function leadFor(kind: LogKind, note: string | null): string {
  if (note) return note;
  if (kind === "folder") {
    return "Tallene er lest fra loggfiler på denne maskinen. kold endrer ingen handler.";
  }
  if (kind === "upload") {
    return "Tallene er lest fra filen du valgte. Filen blir bare i dette vinduet.";
  }
  return "Tallene under er oppdiktet eksempeldata, så oversikten kan vises før en logg er lest.";
}

function errorText(row: LogRow): string {
  return row.detail.trim() || row.reason.trim() || "Sendefeil";
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function LogIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3.5h7l5 5V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" />
      <path d="M14 3.5V9h5.5" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}

export function Dashboard({ initial }: { initial: LoadedLog }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState(initial.files);
  const [kind, setKind] = useState<LogKind>(initial.kind);
  const [label, setLabel] = useState(initial.label);
  const [note, setNote] = useState(initial.note);
  const [readError, setReadError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("3m");

  const parsed = useMemo(() => parseLogs(files.map((file) => file.text)), [files]);
  const summary = useMemo(() => summarize(parsed.rows), [parsed]);
  const points = useMemo(
    () => seriesInRange(summary.pnlSeries, summary.lastTime, range),
    [summary, range],
  );

  const badTime = parsed.warnings.filter((warning) => warning.code === "bad-time").length;
  const noHeader = parsed.warnings.some((warning) => warning.code === "no-header");
  const maxSkip = Math.max(1, ...summary.skips.map((item) => item.count));
  const trades = [
    ...summary.openTrades.slice().sort((a, b) => (b.openTime?.getTime() ?? 0) - (a.openTime?.getTime() ?? 0)),
    ...summary.closedTrades
      .slice()
      .sort((a, b) => (b.closeTime?.getTime() ?? 0) - (a.closeTime?.getTime() ?? 0)),
  ];

  function openPicker() {
    inputRef.current?.click();
  }

  function reset() {
    setFiles(initial.files);
    setKind(initial.kind);
    setLabel(initial.label);
    setNote(initial.note);
    setReadError(null);
  }

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <Logo />
        </div>
        <nav className="nav" aria-label="Hovedmeny">
          <button type="button" className="on">
            <HomeIcon />
            Oversikt
          </button>
          <button type="button" onClick={openPicker}>
            <LogIcon />
            Logg
          </button>
        </nav>
        <div className="spacer" />
        <div className="acct">
          <div className="avatar" aria-hidden="true">
            DJ
          </div>
          <div>
            <div className="who">Dusan</div>
            <div className="small muted">Kun lesing</div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="top">
          <div className="crumb">
            <b>Oversikt</b>
          </div>
          <div className="right">
            <span className="conn">
              <span className="dot" />
              <span className="conn-label">{label}</span>
            </span>
            <span className="vsep" />
            <ThemeToggle />
            {kind === "upload" ? (
              <button type="button" className="btn secondary sm" onClick={reset}>
                Tilbakestill
              </button>
            ) : null}
            <button type="button" className="btn primary" onClick={openPicker}>
              Les logg
            </button>
            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              accept=".csv,text/csv,text/plain"
              aria-label="Velg CSV-logg"
              onChange={(event) => {
                const input = event.currentTarget;
                const file = input.files?.[0];
                if (!file) return;
                void file
                  .text()
                  .then((text) => {
                    input.value = "";
                    const next = parseLogs([text]);
                    setFiles([{ name: file.name, text }]);
                    setKind("upload");
                    setLabel(file.name);
                    setNote(next.rows.length === 0 ? "Filen hadde ingen rader kold kunne lese." : null);
                    setReadError(null);
                  })
                  .catch(() => {
                    input.value = "";
                    setReadError("Filen kunne ikke leses.");
                  });
              }}
            />
          </div>
        </header>

        <section className="content">
          <div>
            <h1 className="display" suppressHydrationWarning>
              {greeting(new Date())}, Dusan.
            </h1>
            <p className="lead">{readError ?? leadFor(kind, note)}</p>
            {badTime > 0 ? (
              <p className="hint">
                {noun(badTime, "rad har", "rader har")} et tidspunkt kold ikke kjente igjen.
              </p>
            ) : null}
            {noHeader ? (
              <p className="hint">Filen har ingen overskriftsrad. Kolonnene er lest i standard rekkefølge.</p>
            ) : null}
          </div>

          <div className="kpis">
            <article className="card kpi">
              <div className="label">Resultat</div>
              <div
                className={`big num${summary.pnl > 0 ? " gain" : summary.pnl < 0 ? " loss" : ""}`}
                data-testid="pnl"
              >
                {formatMoney(summary.pnl)}
              </div>
              <div className="sub">sum av lukkede handler</div>
            </article>
            <article className="card kpi">
              <div className="label">Treffprosent</div>
              <div className="big num" data-testid="win-rate">
                {summary.winRate == null ? "Ingen" : formatPercent(summary.winRate, 1)}
              </div>
              <div className="sub">
                {summary.winRate == null
                  ? "ingen lukkede handler"
                  : `${noun(summary.wins, "gevinst", "gevinst")}, ${noun(summary.losses, "tap", "tap")}`}
              </div>
            </article>
            <article className="card kpi">
              <div className="label">Handler</div>
              <div className="big num" data-testid="trades">
                {formatNumber(summary.tradeCount, 0)}
              </div>
              <div className="sub">
                {noun(summary.openTrades.length, "åpen", "åpne")},{" "}
                {noun(summary.closedTrades.length, "lukket", "lukkede")}
              </div>
            </article>
          </div>

          <div className="row2">
            <article className="card chartc">
              <div className="ch">
                <div>
                  <h2 className="h2">Utvikling</h2>
                  <div className="legend">
                    <span className="lg">
                      <i />
                      Resultat
                    </span>
                  </div>
                </div>
                <div className="seg" role="group" aria-label="Periode">
                  {RANGES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={range === item.id ? "on" : undefined}
                      aria-pressed={range === item.id}
                      onClick={() => setRange(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <PnlChart points={points} />
            </article>

            <article className="card sidepanel">
              <div className="panel-head">
                <h2 className="h2">Hoppet over</h2>
                <span className="num count">{formatNumber(summary.skipCount, 0)}</span>
              </div>
              {summary.skips.length === 0 ? (
                <p className="empty tight">Ingen hoppet over.</p>
              ) : (
                <ul className="skips">
                  {summary.skips.map((item) => (
                    <li key={item.reason}>
                      <div className="skip-row">
                        <span>{skipLabel(item.reason)}</span>
                        <span className="num">{formatNumber(item.count, 0)}</span>
                      </div>
                      <div className="bar" aria-hidden="true">
                        <span style={{ width: `${(item.count / maxSkip) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="panel-head split">
                <h2 className="h2">Sendefeil</h2>
                <span className="num count">{formatNumber(summary.errors.length, 0)}</span>
              </div>
              {summary.errors.length === 0 ? (
                <p className="empty tight">Ingen sendefeil.</p>
              ) : (
                <ul className="errors">
                  {summary.errors.map((row) => (
                    <li key={`${row.line}-${row.timeRaw}`}>
                      <span className="when">{row.time ? formatLogDateTime(row.time) : "Uten tid"}</span>
                      <span>{errorText(row)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </div>

          <article className="card tbl">
            <div className="scroll">
              <table>
                <caption className="sr-only">Handler</caption>
                <thead>
                  <tr>
                    <th>Instrument</th>
                    <th>Retning</th>
                    <th className="r">Volum</th>
                    <th className="r">Innkurs</th>
                    <th className="r">Utkurs</th>
                    <th className="r">Resultat</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.length === 0 ? (
                    <tr>
                      <td className="empty-cell" colSpan={6}>
                        Ingen handler i loggen.
                      </td>
                    </tr>
                  ) : (
                    trades.map((trade) => <TradeRow key={tradeKey(trade)} trade={trade} />)
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

function tradeKey(trade: Trade): string {
  return [trade.ticket, trade.status, trade.openTime?.toISOString() ?? "", trade.closeTime?.toISOString() ?? ""].join(
    "-",
  );
}

function TradeRow({ trade }: { trade: Trade }) {
  const name = instrumentName(trade.symbol);
  const when = [trade.openTime, trade.closeTime].filter((date): date is Date => date != null);
  const title = when.map((date) => formatLogDateTime(date)).join(", ");
  return (
    <tr title={title || undefined}>
      <td>
        <span className="tk">{trade.symbol || "Ukjent"}</span>
        {name ? ` ${name}` : ""}
      </td>
      <td>{sideLabel(trade.side)}</td>
      <td className="num r">{trade.volume == null ? <span className="muted">Mangler</span> : formatNumber(trade.volume, 2)}</td>
      <td className="num r">
        {trade.openPrice == null ? <span className="muted">Mangler</span> : formatNumber(trade.openPrice, 2)}
      </td>
      <td className="num r">
        {trade.status === "open" ? (
          <span className="muted">Åpen</span>
        ) : trade.closePrice == null ? (
          <span className="muted">Mangler</span>
        ) : (
          formatNumber(trade.closePrice, 2)
        )}
      </td>
      <td className="num r">
        {trade.status === "open" || trade.profit == null ? (
          <span className="muted">{trade.status === "open" ? "Åpen" : "Mangler"}</span>
        ) : (
          <span className={trade.profit > 0 ? "gain" : trade.profit < 0 ? "loss" : undefined}>
            {formatMoney(trade.profit)}
          </span>
        )}
      </td>
    </tr>
  );
}
