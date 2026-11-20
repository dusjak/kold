import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseLog, parseNumber, parseTime } from "./parse-log";

const fixture = fs.readFileSync(path.join(process.cwd(), "fixtures", "ea-log-sample.csv"), "utf8");

describe("parseLog", () => {
  it("leser eksempelloggen og beholder ukjent hendelse og ukjent kolonne", () => {
    const parsed = parseLog(fixture);
    const heartbeat = parsed.rows.find((row) => row.event === "HEARTBEAT");
    expect(heartbeat).toBeDefined();
    expect(heartbeat?.extra.note).toBe("synthetic");
    expect(heartbeat?.fields.note).toBe("synthetic");
    expect(heartbeat?.comment).toBe("M15_M1_Trend_v1");
    expect(heartbeat?.magic).toBe(150150);
    expect(parsed.rows.some((row) => row.event === "SKIP_SPREAD")).toBe(true);
    expect(parsed.rows.some((row) => row.event === "SEND_ERROR")).toBe(true);
    expect(parsed.rows.some((row) => row.event === "DEINIT")).toBe(true);
    expect(parsed.rows.some((row) => row.event === "SUMMARY")).toBe(true);
    expect(parsed.warnings.filter((warning) => warning.code === "bad-time")).toHaveLength(0);
  });

  it("holder eksempelloggen fri for strategikode og hemmeligheter", () => {
    expect(fixture).toMatch(/SYNTHETIC/);
    expect(fixture).toMatch(/Oppdiktet/);
    expect(fixture).not.toMatch(/OrderSend|OnTick|OnInit|input double|password|api_key/i);
  });

  it("tåler semikolon, norsk tall og komma inni anførselstegn", () => {
    const parsed = parseLog(
      'time;event;profit;detail\n02.11.2026 10:00:00;CLOSE;"1 284,50";"hei, der"\n',
    );
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].profit).toBe(1284.5);
    expect(parsed.rows[0].detail).toBe("hei, der");
    expect(parsed.rows[0].time?.toISOString()).toBe("2026-11-02T10:00:00.000Z");
  });

  it("beholder en ukjent kolonne midt i raden", () => {
    const parsed = parseLog("time,note,event,profit\n2026-01-02T10:00:00Z,hei,WHATEVER,12.5\n");
    expect(parsed.rows[0].event).toBe("WHATEVER");
    expect(parsed.rows[0].extra.note).toBe("hei");
    expect(parsed.rows[0].profit).toBe(12.5);
    expect(parsed.rows[0].time?.toISOString()).toBe("2026-01-02T10:00:00.000Z");
  });

  it("bruker type som hendelse, og som retning når hendelse allerede finnes", () => {
    const asEvent = parseLog("time,type,symbol\n2026.01.01 00:00:00,SKIP_SPREAD,XAUUSD\n");
    expect(asEvent.rows[0].event).toBe("SKIP_SPREAD");
    const asSide = parseLog("time,event,type\n2026.01.01 00:00:00,OPEN,buy\n");
    expect(asSide.rows[0].event).toBe("OPEN");
    expect(asSide.rows[0].side).toBe("buy");
  });

  it("leser en fil uten overskrift i fast rekkefølge og hopper over gjentatt overskrift", () => {
    const headerless = parseLog(
      "2026.01.01 00:00:00,OPEN,XAUUSD,150150,M15_M1_Trend_v1,9,buy,0.1,2400,2390,2420,15\n",
    );
    expect(headerless.warnings.some((warning) => warning.code === "no-header")).toBe(true);
    expect(headerless.rows[0].event).toBe("OPEN");
    expect(headerless.rows[0].ticket).toBe("9");
    expect(headerless.rows[0].profit).toBe(15);
    expect(headerless.rows[0].price).toBe(2400);

    const repeated = parseLog("time,event\ntime,event\n2026.01.01 00:00:00,OPEN\n");
    expect(repeated.rows).toHaveLength(1);
    expect(repeated.rows[0].event).toBe("OPEN");
  });

  it("beholder en ujevn rad og varsler om et tidspunkt som ikke kan leses", () => {
    const parsed = parseLog("time,event,symbol\nikke-en-dato,OPEN\n");
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].event).toBe("OPEN");
    expect(parsed.rows[0].symbol).toBe("");
    expect(parsed.warnings.some((warning) => warning.code === "bad-time")).toBe(true);
  });

  it("leser MT4-tid og begge tusenskilletegn", () => {
    expect(parseTime("2026.08.04 09:15:00")?.toISOString()).toBe("2026-08-04T09:15:00.000Z");
    expect(parseNumber("1.284,50")).toBe(1284.5);
    expect(parseNumber("1,284.50")).toBe(1284.5);
    expect(parseNumber("")).toBeNull();
    expect(parseNumber("requote")).toBeNull();
  });
});
