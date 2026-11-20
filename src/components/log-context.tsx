"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { LoadedLog, LogFile } from "@/lib/load-log";
import { parseLogs, type LogRow, type LogWarning } from "@/lib/parse-log";
import { summarize, type Summary } from "@/lib/summarize";

export type LogKind = LoadedLog["kind"] | "upload";

type LogValue = {
  files: LogFile[];
  kind: LogKind;
  label: string;
  note: string | null;
  readError: string | null;
  warnings: LogWarning[];
  rows: LogRow[];
  summary: Summary;
  setUpload: (file: File) => void;
  reset: () => void;
};

const LogContext = createContext<LogValue | null>(null);

function leadFor(kind: LogKind, note: string | null): string {
  if (note) return note;
  if (kind === "folder") return "Tallene er lest fra loggfiler på denne maskinen. kold endrer ingen handler.";
  if (kind === "upload") return "Tallene er lest fra filen du valgte. Filen blir bare i dette vinduet.";
  return "Tallene under er oppdiktet eksempeldata, så oversikten kan vises før en logg er lest.";
}

export function leadText(value: Pick<LogValue, "kind" | "note" | "readError">): string {
  return value.readError ?? leadFor(value.kind, value.note);
}

export function LogProvider({ initial, children }: { initial: LoadedLog; children: ReactNode }) {
  const [files, setFiles] = useState(initial.files);
  const [kind, setKind] = useState<LogKind>(initial.kind);
  const [label, setLabel] = useState(initial.label);
  const [note, setNote] = useState(initial.note);
  const [readError, setReadError] = useState<string | null>(null);

  const parsed = useMemo(() => parseLogs(files.map((file) => file.text)), [files]);
  const summary = useMemo(() => summarize(parsed.rows), [parsed]);

  const value = useMemo<LogValue>(
    () => ({
      files,
      kind,
      label,
      note,
      readError,
      warnings: parsed.warnings,
      rows: parsed.rows,
      summary,
      setUpload(file) {
        void file
          .text()
          .then((text) => {
            const next = parseLogs([text]);
            setFiles([{ name: file.name, text }]);
            setKind("upload");
            setLabel(file.name);
            setNote(next.rows.length === 0 ? "Filen hadde ingen rader kold kunne lese." : null);
            setReadError(null);
          })
          .catch(() => setReadError("Filen kunne ikke leses."));
      },
      reset() {
        setFiles(initial.files);
        setKind(initial.kind);
        setLabel(initial.label);
        setNote(initial.note);
        setReadError(null);
      },
    }),
    [files, kind, label, note, readError, parsed, summary, initial],
  );

  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
}

export function useLog(): LogValue {
  const value = useContext(LogContext);
  if (!value) throw new Error("Logg mangler");
  return value;
}
