import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadLog, readCsvFolder } from "./load-log";

const original = process.env.LOG_DIR;

afterEach(() => {
  if (original === undefined) delete process.env.LOG_DIR;
  else process.env.LOG_DIR = original;
});

describe("loadLog", () => {
  it("leser bare csv fra mappen og rører ikke mq4", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kold-log-"));
    fs.writeFileSync(path.join(dir, "b.csv"), "time,event\n2026.01.02 00:00:00,OPEN\n");
    fs.writeFileSync(path.join(dir, "a.csv"), "time,event\n2026.01.01 00:00:00,SKIP_SPREAD\n");
    fs.writeFileSync(path.join(dir, "secret.mq4"), "SECRET_STRATEGY_BODY OrderSend\n");
    fs.writeFileSync(path.join(dir, "notat.txt"), "ikke en logg");

    const found = readCsvFolder(dir);
    expect(found?.files.map((file) => file.name)).toEqual(["a.csv", "b.csv"]);
    const combined = found?.files.map((file) => file.text).join("\n") ?? "";
    expect(combined).not.toMatch(/SECRET_STRATEGY_BODY|OrderSend/);
    expect(combined).toMatch(/SKIP_SPREAD/);
    expect(combined).toMatch(/OPEN/);
  });

  it("faller tilbake til eksempelloggen når mappen mangler", () => {
    process.env.LOG_DIR = path.join(os.tmpdir(), "kold-mangler-denne-mappen");
    const loaded = loadLog();
    expect(loaded.kind).toBe("fixture");
    expect(loaded.note).toMatch(/eksempelloggen/);
    expect(loaded.files[0].text).toMatch(/SYNTHETIC/);
  });

  it("bruker eksempelloggen når LOG_DIR ikke er satt", () => {
    delete process.env.LOG_DIR;
    const loaded = loadLog();
    expect(loaded.kind).toBe("fixture");
    expect(loaded.note).toBeNull();
    expect(loaded.label).toBe("Eksempellogg");
  });
});
