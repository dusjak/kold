"use client";

import { useRef } from "react";
import { formatLogDateTime, formatMoney, formatNumber, formatPercent, sideLabel, skipLabel } from "@/lib/format";
import { leadText, useLog } from "./log-context";

export function Historikk() {
  const log = useLog();
  const inputRef = useRef<HTMLInputElement>(null);
  const { summary } = log;
  const badTime = log.warnings.filter((warning) => warning.code === "bad-time").length;
  const noHeader = log.warnings.some((warning) => warning.code === "no-header");

  return (
    <div className="hoved historikk">
      <header className="topp">
        <div>
          <h1 className="h1">Historikk</h1>
          <p className="hint">{leadText(log)}</p>
          {badTime > 0 ? (
            <p className="hint">
              {badTime === 1 ? "1 rad har" : `${formatNumber(badTime, 0)} rader har`} et tidspunkt kold ikke kjente igjen.
            </p>
          ) : null}
          {noHeader ? <p className="hint">Filen har ingen overskriftsrad. Kolonnene er lest i standard rekkefølge.</p> : null}
        </div>
        <div className="handlinger">
          {log.kind === "upload" ? (
            <button type="button" className="knapp sekund" onClick={log.reset}>
              Tilbakestill
            </button>
          ) : null}
          <button type="button" className="knapp primaer" onClick={() => inputRef.current?.click()}>
            Les logg
          </button>
          <input
            ref={inputRef}
            className="fil"
            type="file"
            accept=".csv,text/csv,text/plain"
            aria-label="Velg CSV-logg"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) log.setUpload(file);
            }}
          />
        </div>
      </header>

      <div className="kpi-rad">
        <article className="kpi">
          <p className="etikett dempet">Resultat</p>
          <p className={`stor ${summary.pnl > 0 ? "gevinst" : summary.pnl < 0 ? "tap" : ""}`}>{formatMoney(summary.pnl)}</p>
          <p className="etikett dempet">sum av lukkede handler</p>
        </article>
        <article className="kpi">
          <p className="etikett dempet">Treffprosent</p>
          <p className="stor">{summary.winRate == null ? "Ingen" : formatPercent(summary.winRate, 1)}</p>
          <p className="etikett dempet">
            {summary.winRate == null
              ? "ingen lukkede handler"
              : `${formatNumber(summary.wins, 0)} gevinst, ${formatNumber(summary.losses, 0)} tap`}
          </p>
        </article>
        <article className="kpi">
          <p className="etikett dempet">Handler</p>
          <p className="stor">{formatNumber(summary.tradeCount, 0)}</p>
          <p className="etikett dempet">
            {formatNumber(summary.openTrades.length, 0)} {summary.openTrades.length === 1 ? "åpen" : "åpne"},{" "}
            {formatNumber(summary.closedTrades.length, 0)} {summary.closedTrades.length === 1 ? "lukket" : "lukkede"}
          </p>
        </article>
      </div>

      <section className="blokk">
        <div className="blokk-hode">
          <h2 className="h2">Hoppet over</h2>
          <span className="tall-sm dempet">{formatNumber(summary.skipCount, 0)}</span>
        </div>
        {summary.skips.length === 0 ? (
          <p className="hint">Ingen hoppet over.</p>
        ) : (
          <ul className="liste">
            {summary.skips.map((item) => (
              <li key={item.reason} className="liste-rad">
                <span>{skipLabel(item.reason)}</span>
                <span className="tall-sm">{formatNumber(item.count, 0)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="blokk">
        <h2 className="h2">Sendefeil</h2>
        {summary.errors.length === 0 ? (
          <p className="hint">Ingen sendefeil.</p>
        ) : (
          <ul className="liste">
            {summary.errors.map((row) => (
              <li key={`${row.line}-${row.timeRaw}`} className="liste-rad">
                <span className="tall-sm dempet">{row.time ? formatLogDateTime(row.time) : "Uten tid"}</span>
                <span className="body-sm">{row.detail.trim() || row.reason.trim() || "Sendefeil"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="blokk">
        <h2 className="h2">Lukkede handler</h2>
        <div className="tabell">
          <table>
            <thead>
              <tr>
                <th>Bot</th>
                <th>Instrument</th>
                <th>Retning</th>
                <th className="tallkol">Størrelse (lot)</th>
                <th className="tallkol">Inngang</th>
                <th className="tallkol">Ut</th>
                <th className="tallkol">Lukket</th>
                <th className="tallkol">Resultat (kr)</th>
              </tr>
            </thead>
            <tbody>
              {summary.closedTrades.length === 0 ? (
                <tr>
                  <td className="tom-rad" colSpan={8}>
                    Ingen handler i loggen.
                  </td>
                </tr>
              ) : (
                summary.closedTrades
                  .slice()
                  .sort((a, b) => (b.closeTime?.getTime() ?? 0) - (a.closeTime?.getTime() ?? 0))
                  .map((trade) => (
                    <tr key={`${trade.ticket}-${trade.closeTime?.toISOString() ?? ""}`}>
                      <td>{trade.comment || trade.symbol}</td>
                      <td>{trade.symbol}</td>
                      <td>{sideLabel(trade.side)}</td>
                      <td className="tallkol tall-sm">{trade.volume == null ? "Mangler" : formatNumber(trade.volume, 2)}</td>
                      <td className="tallkol tall-sm">{trade.openPrice == null ? "Mangler" : formatNumber(trade.openPrice, 2)}</td>
                      <td className="tallkol tall-sm">{trade.closePrice == null ? "Mangler" : formatNumber(trade.closePrice, 2)}</td>
                      <td className="tallkol tall-sm">{trade.closeTime ? formatLogDateTime(trade.closeTime) : "Mangler"}</td>
                      <td className="tallkol tall-sm">
                        {trade.profit == null ? (
                          "Mangler"
                        ) : (
                          <span className={trade.profit > 0 ? "gevinst" : trade.profit < 0 ? "tap" : undefined}>
                            {formatMoney(trade.profit)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
