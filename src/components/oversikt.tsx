"use client";

import { useMemo, useState } from "react";
import { oversiktConfig } from "@/config/oversikt";
import {
  formatClock,
  formatMoney,
  formatNumber,
  formatPercent,
  formatPrice,
  formatResultDay,
  formatSignedNumber,
  formatSignedPercent,
  greeting,
  sideLabel,
} from "@/lib/format";
import {
  buildBots,
  buildPositions,
  heroState,
  heroStatus,
  openResult,
  runningLabel,
  type BotView,
  type PositionView,
} from "@/lib/overview";
import { seriesInRange, type RangeKey } from "@/lib/summarize";
import { HeroChart, Sparkline } from "./hero-chart";
import { Ikon } from "./ikon";
import { useLog } from "./log-context";

const PERIODER: { id: RangeKey; label: string; tekst: string }[] = [
  { id: "1d", label: "1d", tekst: "I DAG" },
  { id: "1u", label: "1u", tekst: "1 UKE" },
  { id: "1m", label: "1 mnd", tekst: "1 MND" },
  { id: "3m", label: "3 mnd", tekst: "3 MND" },
  { id: "1y", label: "1 år", tekst: "1 ÅR" },
];

export function Oversikt() {
  const log = useLog();
  const [range, setRange] = useState<RangeKey>("3m");
  const anchor = useMemo(() => log.summary.lastTime ?? new Date(), [log.summary.lastTime]);
  const bots = useMemo(() => buildBots(log.summary, log.rows, oversiktConfig, anchor), [log.summary, log.rows, anchor]);
  const positions = useMemo(() => buildPositions(log.summary), [log.summary]);
  const points = useMemo(() => seriesInRange(log.summary.pnlSeries, anchor, range), [log.summary, anchor, range]);
  const pnl = points.reduce((sum, point) => sum + point.profit, 0);
  const periode = PERIODER.find((item) => item.id === range) ?? PERIODER[0];
  const reference = oversiktConfig.referanseKontoKr;
  const konto = reference == null ? null : reference + log.summary.pnl;
  const dayConfig = range === "1d" ? oversiktConfig : { ...oversiktConfig, dagsgrenseKr: null };
  const state = heroState(pnl, dayConfig, konto);
  const brokeAmount = konto == null ? null : formatNumber(konto, 2);
  const amount = state === "broke" ? brokeAmount : formatSignedNumber(pnl, 2);
  const subline = cardSubline(state, pnl, dayConfig.dagsgrenseKr, reference);
  const openPnl = openResult(positions);

  return (
    <div className="hoved">
      <header className="topp">
        <div>
          <h1 className="text-h1" suppressHydrationWarning>
            {greeting(new Date())}, {oversiktConfig.fornavn}
          </h1>
          {log.readError || log.note ? <p className="hint">{log.readError ?? log.note}</p> : null}
        </div>
        <div className="topp-hoyre">
          <span className="status text-label">
            <span className="prikk" />
            {log.label}
          </span>
          <span className="bjelle" aria-hidden="true">
            <Ikon navn="varsel" />
          </span>
          <button type="button" className="knapp text-button stopp" disabled aria-disabled="true">
            ■  Stopp alt
          </button>
        </div>
      </header>

      <section className="hero" data-state={state} aria-label="Resultat">
        <div className="hero-tekstur" />
        <div className="hero-tekstur-mork" />
        <div className="hero-fakta">
          <p className="hero-oye">
            {state === "broke"
              ? "SALDO"
              : range === "1d"
                ? `RESULTAT I DAG · ${formatResultDay(anchor)}`
                : `RESULTAT · ${periode.tekst}`}
          </p>
          <div className="hero-tall">
            <span className="hero-belop">{amount ?? "Mangler"}</span>
            {amount != null ? <span className="hero-kr">kr</span> : null}
          </div>
          {subline ? <p className="hero-sub">{subline}</p> : null}
          <p className="hero-status">{heroStatus(state, bots)}</p>
          {state === "megaloss" ? (
            <button type="button" className="hero-stopp" disabled aria-disabled="true">
              ■  Stopp alt
            </button>
          ) : null}
        </div>
        <div className="hero-graf">
          <div className="tegnforklaring">
            <span className="strek" />
            Portefølje
            <span className="strek ref" />
            OSEBX
          </div>
          <div className="plot">
            <HeroChart points={points} />
          </div>
        </div>
        <div className="hero-side">
          <div className="hero-par">
            <span className="hero-label">Kontoverdi</span>
            <span className="hero-konto">{konto == null ? "Mangler" : formatMoney(konto, false)}</span>
          </div>
          <div className="hero-par">
            <span className="hero-label">Siden start</span>
            <span className="hero-konto">{formatMoney(log.summary.pnl)}</span>
          </div>
          <div className="periode" role="group" aria-label="Periode">
            {PERIODER.map((item) => (
              <button
                key={item.id}
                type="button"
                className={range === item.id ? "paa" : undefined}
                aria-pressed={range === item.id}
                onClick={() => setRange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="blokk">
        <div className="blokk-hode">
          <div className="blokk-tittel">
            <h2 className="text-h2">Mine Boter</h2>
            <p className="text-body dempet">{runningLabel(bots)}</p>
          </div>
          <button type="button" className="knapp text-button primaer" disabled aria-disabled="true">
            Kjøp flere boter
          </button>
        </div>
        {bots.length === 0 ? (
          <p className="hint">Ingen handler i loggen.</p>
        ) : (
          <div className="boter">
            {bots.map((bot) => (
              <BotKort key={bot.id} bot={bot} />
            ))}
          </div>
        )}
      </section>

      <section className="blokk">
        <div className="pos-hode">
          <h2 className="text-h2">Åpne posisjoner</h2>
          <p className="text-body-sm pos-oppsummering">
            Viser {positions.length} av {positions.length} åpne
            {openPnl == null ? null : (
              <>
                {" "}
                · åpent resultat{" "}
                <span className={openPnl > 0 ? "gevinst" : openPnl < 0 ? "tap" : undefined}>{formatMoney(openPnl)}</span>
              </>
            )}
          </p>
        </div>
        <Posisjonstabell positions={positions} />
      </section>
    </div>
  );
}

function cardSubline(state: ReturnType<typeof heroState>, pnl: number, limit: number | null, reference: number | null): string {
  if (state === "broke") return "Ingen margin til neste handel";
  const parts: string[] = [];
  if (reference != null && reference !== 0) parts.push(formatSignedPercent(pnl / reference, 2));
  if (limit != null && limit !== 0) {
    parts.push(state === "megaloss" ? "over dagens grense" : `${formatPercent(Math.abs(pnl) / limit, 0)} av dagens grense`);
  }
  return parts.join(" · ");
}

function BotKort({ bot }: { bot: BotView }) {
  const todayTone = bot.status === "pause" || bot.todayPnl === 0 ? "dempet" : bot.todayPnl > 0 ? "gevinst" : "tap";
  const tone = bot.totalPnl > 0 ? "gevinst" : bot.totalPnl < 0 ? "tap" : "dempet";
  const chipClass = bot.status === "naer" ? "naer" : bot.status === "pause" ? "pause" : "kjoper";
  return (
    <article className={bot.status === "pause" ? "botkort pause" : "botkort"}>
      <div className="bot-topp">
        <div>
          <h3 className="bot-navn text-h3">{bot.name}</h3>
          <p className="text-body-sm dempet">{bot.market}</p>
        </div>
        <span className={bot.status === "pause" ? "bryter" : "bryter paa"} aria-hidden="true" />
      </div>
      <div className="bot-rad">
        <span className={`merke-status text-label ${chipClass}`}>{bot.chip}</span>
        <span className="text-body-sm dempet">
          {bot.status === "pause"
            ? bot.pausedSince
              ? `På pause siden ${formatClock(bot.pausedSince)}`
              : "På pause"
            : `${bot.openCount} åpne posisjoner`}
        </span>
      </div>
      <div className="bot-tall">
        <div>
          <span className="text-label dempet">I dag (kr)</span>
          <span className={`num ${todayTone === "gevinst" ? "gevinst" : todayTone === "tap" ? "tap" : "dempet"}`}>
            {formatSignedNumber(bot.todayPnl, 2)}
          </span>
        </div>
        <div>
          <span className="text-label dempet">Totalt (kr)</span>
          <span className="num">{formatSignedNumber(bot.totalPnl, 2)}</span>
        </div>
        <Sparkline values={bot.spark} tone={tone === "dempet" ? "dempet" : tone} />
      </div>
      {bot.warning ? (
        <p className="varsel text-label">△   {bot.warning}</p>
      ) : (
        <div className="grense">
          <div className="spor" aria-hidden="true">
            <span style={{ width: bot.limit ? `${Math.min(100, (bot.usedKr / bot.limit) * 100)}%` : "0%" }} />
          </div>
          <div className="bot-rad">
            <span className="text-label dempet">Dagsgrense</span>
            <span className="text-label" style={{ color: "var(--kold-text-subdued)" }}>
              {bot.status === "pause" || bot.limit == null
                ? "Brukes ikke på pause"
                : `${formatNumber(bot.usedKr, 0)} av ${formatNumber(bot.limit, 0)} kr`}
            </span>
          </div>
        </div>
      )}
    </article>
  );
}

export function Posisjonstabell({ positions }: { positions: PositionView[] }) {
  return (
    <div className="tabell">
      <table>
        <caption className="fil">Åpne posisjoner</caption>
        <thead>
          <tr>
            <th className="text-label">Bot</th>
            <th className="text-label">Instrument</th>
            <th className="text-label">Retning</th>
            <th className="text-label tallkol num-end">Størrelse (lot)</th>
            <th className="text-label tallkol num-end">Inngang</th>
            <th className="text-label tallkol num-end">Nå</th>
            <th className="text-label tallkol num-end">Stop loss</th>
            <th className="text-label tallkol num-end">Åpnet</th>
            <th className="text-label tallkol num-end">Resultat (kr)</th>
          </tr>
        </thead>
        <tbody>
          {positions.length === 0 ? (
            <tr>
              <td className="tom-rad" colSpan={9}>
                Ingen handler i loggen.
              </td>
            </tr>
          ) : (
            positions.map((position) => <Posisjon key={position.id} position={position} />)
          )}
        </tbody>
      </table>
    </div>
  );
}

function Posisjon({ position }: { position: PositionView }) {
  return (
    <tr>
      <td>{position.bot}</td>
      <td>
        <span className="merke text-label">{position.badge}</span>
      </td>
      <td>{sideLabel(position.side)}</td>
      <td className="tallkol num-sm num-end">{position.volume == null ? "Mangler" : formatNumber(position.volume, 2)}</td>
      <td className="tallkol num-sm num-end">{position.entry == null ? "Mangler" : formatPrice(position.entry)}</td>
      <td className="tallkol num-sm num-end">{position.mark == null ? "Mangler" : formatPrice(position.mark)}</td>
      <td className="tallkol num-sm num-end">{position.stop == null ? "Mangler" : formatPrice(position.stop)}</td>
      <td className="tallkol num-sm num-end">{position.opened ? formatClock(position.opened) : "Mangler"}</td>
      <td className="tallkol num-sm num-end">
        {position.profit == null ? (
          <span className="dempet">Åpen</span>
        ) : (
          <span className={position.profit > 0 ? "gevinst" : position.profit < 0 ? "tap" : undefined}>
            {formatMoney(position.profit)}
          </span>
        )}
      </td>
    </tr>
  );
}
