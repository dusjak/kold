import fs from "node:fs";
import path from "node:path";

export type LogFile = {
  name: string;
  text: string;
};

export type LoadedLog = {
  kind: "fixture" | "folder";
  label: string;
  note: string | null;
  files: LogFile[];
};

const MAX_FILES = 20;
const MAX_BYTES = 2_000_000;

export function fixtureFile(): LogFile {
  return {
    name: "ea-log-sample.csv",
    text: fs.readFileSync(path.join(process.cwd(), "fixtures", "ea-log-sample.csv"), "utf8"),
  };
}

export function readCsvFolder(dir: string): { files: LogFile[]; skipped: string[] } | null {
  let stat: fs.Stats;
  try {
    stat = fs.statSync(dir);
  } catch {
    return null;
  }
  if (!stat.isDirectory()) return null;

  const names = fs
    .readdirSync(dir)
    .filter((name) => {
      if (name.startsWith(".")) return false;
      if (name.includes("/") || name.includes("\\") || name.includes("\0")) return false;
      return name.toLowerCase().endsWith(".csv");
    })
    .sort((a, b) => a.localeCompare(b, "nb"));

  const files: LogFile[] = [];
  const skipped: string[] = [];
  for (const name of names) {
    if (files.length >= MAX_FILES) {
      skipped.push(name);
      continue;
    }
    const full = path.join(dir, name);
    let fileStat: fs.Stats;
    try {
      fileStat = fs.statSync(full);
    } catch {
      skipped.push(name);
      continue;
    }
    if (!fileStat.isFile() || fileStat.size > MAX_BYTES) {
      skipped.push(name);
      continue;
    }
    files.push({ name, text: fs.readFileSync(full, "utf8") });
  }
  return { files, skipped };
}

function fixtureFallback(note: string): LoadedLog {
  return {
    kind: "fixture",
    label: "Eksempellogg",
    note,
    files: [fixtureFile()],
  };
}

export function loadLog(): LoadedLog {
  const configured = process.env["LOG_DIR"]?.trim();
  if (!configured) {
    return {
      kind: "fixture",
      label: "Eksempellogg",
      note: null,
      files: [fixtureFile()],
    };
  }

  const found = readCsvFolder(path.resolve(configured));
  if (!found) {
    return fixtureFallback("LOG_DIR er satt, men mappen finnes ikke. Viser eksempelloggen.");
  }
  if (found.files.length === 0) {
    return fixtureFallback("Mappen har ingen CSV-filer kold kan lese. Viser eksempelloggen.");
  }

  return {
    kind: "folder",
    label: found.files.length === 1 ? found.files[0].name : `${found.files.length} filer`,
    note: found.skipped.length
      ? "Noen filer ble hoppet over. kold leser inntil 20 CSV-filer, hver på maks 2 MB."
      : null,
    files: found.files,
  };
}
