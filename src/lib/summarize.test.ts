import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseLog } from "./parse-log";
import { seriesInRange, summarize } from "./summarize";

const fixture = parseLog(
  fs.readFileSync(path.join(process.cwd(), "fixtures", "ea-log-sample.csv"), "utf8"),
);

describe("summarize", () => {
  const summary = summarize(fixture.rows);

  it("samler resultat, treff og åpne og lukkede handler fra eksempelloggen", () => {
    expect(summary.closedTrades).toHaveLength(10);
    expect(summary.openTrades).toHaveLength(1);
    expect(summary.openTrades[0].ticket).toBe("900011");
    expect(summary.tradeCount).toBe(11);
    expect(summary.wins).toBe(7);
    expect(summary.losses).toBe(3);
    expect(summary.winRate).toBeCloseTo(0.7);
    expect(summary.pnl).toBeCloseTo(3285.5);
    expect(summary.pnlSeries).toHaveLength(10);
    expect(summary.pnlSeries.at(-1)?.value).toBeCloseTo(3285.5);
    expect(summary.approvedCount).toBe(11);
  });

  it("grupperer hoppgrunner og senderfeil uten å slippe ukjente hendelser", () => {
    expect(summary.skipCount).toBe(8);
    expect(Object.fromEntries(summary.skips.map((item) => [item.reason, item.count]))).toEqual({
      SPREAD: 4,
      SESSION: 2,
      MARGIN: 1,
      MAXPOS: 1,
    });
    expect(summary.errors).toHaveLength(2);
    expect(summary.errors[1].detail).toBe("off quotes, prøv igjen");
    expect(fixture.rows.some((row) => row.event === "HEARTBEAT")).toBe(true);
  });

  it("regner utviklingen på nytt innenfor intervallet", () => {
    const ranged = seriesInRange(summary.pnlSeries, summary.lastTime, "3m");
    expect(ranged[0].profit).toBeCloseTo(640);
    expect(ranged[0].value).toBeCloseTo(640);
    expect(ranged.at(-1)?.value).toBeCloseTo(3046);
  });

  it("lukker CLOSE_SL, teller null resultat, og tåler lukking uten åpning", () => {
    const parsed = parseLog(
      [
        "time,event,symbol,ticket,side,profit",
        "2026.01.01 10:00:00,OPEN,XAUUSD,1,buy,",
        "2026.01.01 12:00:00,CLOSE_SL,XAUUSD,1,buy,0",
        "2026.01.02 12:00:00,CLOSE,XAUUSD,2,sell,-5",
        "2026.01.02 13:00:00,APPROVED,XAUUSD,,,",
      ].join("\n"),
    );
    const result = summarize(parsed.rows);
    expect(result.closedTrades).toHaveLength(2);
    expect(result.openTrades).toHaveLength(0);
    expect(result.breakeven).toBe(1);
    expect(result.losses).toBe(1);
    expect(result.wins).toBe(0);
    expect(result.winRate).toBe(0);
    expect(result.pnl).toBeCloseTo(-5);
    expect(result.approvedCount).toBe(1);
    expect(result.tradeCount).toBe(2);
  });
});
