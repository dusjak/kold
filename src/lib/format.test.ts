import { describe, expect, it } from "vitest";
import {
  MINUS,
  NBSP,
  THIN,
  formatLogDate,
  formatMoney,
  formatNumber,
  formatPercent,
  formatSignedNumber,
  greeting,
  skipLabel,
} from "./format";

describe("hovedbok", () => {
  it("grupperer tusen med tynt mellomrom og bruker komma", () => {
    expect(formatNumber(1284.5, 2)).toBe(`1${THIN}284,50`);
    expect(formatNumber(420, 0)).toBe("420");
  });

  it("setter pluss foran gevinst og ekte minus foran tap", () => {
    expect(formatMoney(1284.5)).toBe(`+1${THIN}284,50${NBSP}kr`);
    expect(formatMoney(-76.4)).toBe(`${MINUS}76,40${NBSP}kr`);
    expect(formatMoney(0)).toBe(`0,00${NBSP}kr`);
    expect(formatSignedNumber(-180.5, 2).startsWith(MINUS)).toBe(true);
    expect(formatMoney(-76.4).includes("-")).toBe(false);
  });

  it("skriver prosent med hardt mellomrom", () => {
    expect(formatPercent(0.7, 1)).toBe(`70,0${NBSP}%`);
  });

  it("viser dato slik den står i loggen, uten tidssoneflytting", () => {
    expect(formatLogDate(new Date(Date.UTC(2026, 7, 4, 23, 30)))).toBe("4. aug.");
  });

  it("hilser etter klokkeslett", () => {
    expect(greeting(new Date(2026, 7, 4, 8, 0))).toBe("God morgen");
    expect(greeting(new Date(2026, 7, 4, 13, 0))).toBe("God dag");
    expect(greeting(new Date(2026, 7, 4, 19, 0))).toBe("God kveld");
    expect(greeting(new Date(2026, 7, 4, 23, 30))).toBe("God natt");
  });

  it("gir kjente hoppgrunner et rolig navn og beholder ukjente", () => {
    expect(skipLabel("SPREAD")).toBe("Spread");
    expect(skipLabel("MAXPOS")).toBe("Maks antall");
    expect(skipLabel("NY_GRUNN")).toBe("Ny grunn");
  });
});
