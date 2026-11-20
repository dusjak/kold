import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { oversiktConfig } from "@/config/oversikt";
import { parseLog } from "./parse-log";
import { buildBots, buildPositions, heroState, runningLabel } from "./overview";
import { summarize } from "./summarize";

const parsed = parseLog(fs.readFileSync(path.join(process.cwd(), "fixtures", "ea-log-sample.csv"), "utf8"));
const summary = summarize(parsed.rows);

describe("oversikt", () => {
  it("bruker Dusan som fornavn", () => {
    expect(oversiktConfig.fornavn).toBe("Dusan");
  });

  it("velger resultatkort ut fra tersklene", () => {
    expect(heroState(0, oversiktConfig)).toBe("stabil");
    expect(heroState(300, oversiktConfig)).toBe("gevinst");
    expect(heroState(-400, oversiktConfig)).toBe("tap");
    expect(heroState(-2000, oversiktConfig)).toBe("megatap");
  });

  it("bygger boter og åpne posisjoner fra loggen", () => {
    const anchor = summary.lastTime ?? new Date(0);
    const bots = buildBots(summary, parsed.rows, oversiktConfig, anchor);
    expect(bots).toHaveLength(1);
    expect(bots[0].openCount).toBe(1);
    expect(bots[0].status).toBe("kjorer");
    expect(bots[0].totalPnl).toBeCloseTo(3285.5);
    expect(runningLabel(bots)).toBe("1 av 1 kjører");
    const positions = buildPositions(summary);
    expect(positions).toHaveLength(1);
    expect(positions[0].badge).toBe("GOLD");
    expect(positions[0].side).toBe("sell");
    expect(positions[0].stop).not.toBeNull();
  });
});