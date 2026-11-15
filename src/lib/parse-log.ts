export type LogRow = {
  line: number;
  time: Date | null;
  timeRaw: string;
  event: string;
  symbol: string;
  magic: number | null;
  comment: string;
  ticket: string;
  side: string;
  volume: number | null;
  price: number | null;
  sl: number | null;
  tp: number | null;
  profit: number | null;
  balance: number | null;
  reason: string;
  detail: string;
  /** Kolonner som ikke er knyttet til et kjent felt. Ingenting kastes. */
  extra: Record<string, string>;
  /** Alle kolonner, med overskriften slik den står i filen. */
  fields: Record<string, string>;
};

export type LogWarning = {
  code: "no-header" | "bad-time" | "duplicate-column";
  line?: number;
  detail?: string;
};

export type ParseResult = {
  rows: LogRow[];
  headers: string[];
  warnings: LogWarning[];
};

type Field =
  | "time"
  | "event"
  | "symbol"
  | "magic"
  | "comment"
  | "ticket"
  | "side"
  | "volume"
  | "price"
  | "sl"
  | "tp"
  | "profit"
  | "balance"
  | "reason"
  | "detail";

const ALIASES: Record<string, Field> = {
  time: "time",
  datetime: "time",
  timestamp: "time",
  date: "time",
  tid: "time",
  event: "event",
  action: "event",
  hendelse: "event",
  evt: "event",
  symbol: "symbol",
  instrument: "symbol",
  sym: "symbol",
  magic: "magic",
  magicnumber: "magic",
  magic_number: "magic",
  comment: "comment",
  order_comment: "comment",
  ordercomment: "comment",
  kommentar: "comment",
  ticket: "ticket",
  order: "ticket",
  deal: "ticket",
  position: "ticket",
  side: "side",
  direction: "side",
  cmd: "side",
  volume: "volume",
  lots: "volume",
  lot: "volume",
  vol: "volume",
  price: "price",
  open_price: "price",
  openprice: "price",
  pris: "price",
  sl: "sl",
  stop_loss: "sl",
  stoploss: "sl",
  tp: "tp",
  take_profit: "tp",
  takeprofit: "tp",
  profit: "profit",
  pnl: "profit",
  pl: "profit",
  resultat: "profit",
  balance: "balance",
  reason: "reason",
  cause: "reason",
  skip: "reason",
  detail: "detail",
  message: "detail",
  msg: "detail",
  error: "detail",
  text: "detail",
};

const POSITIONAL: Field[] = [
  "time",
  "event",
  "symbol",
  "magic",
  "comment",
  "ticket",
  "side",
  "volume",
  "price",
  "sl",
  "tp",
  "profit",
  "reason",
  "detail",
];

const NUMBER_FIELDS = new Set<Field>([
  "magic",
  "volume",
  "price",
  "sl",
  "tp",
  "profit",
  "balance",
]);

export function normHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s./-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export function parseNumber(raw: string): number | null {
  let value = raw.trim().replace(/[\s\u00a0\u202f]/g, "");
  if (!value) return null;
  value = value.replace(/^\+/, "");
  if (value.includes(",") && value.includes(".")) {
    if (value.lastIndexOf(",") > value.lastIndexOf(".")) {
      value = value.replace(/\./g, "").replace(",", ".");
    } else {
      value = value.replace(/,/g, "");
    }
  } else if (value.includes(",")) {
    value = value.replace(",", ".");
  }
  if (!/^-?\d+(\.\d+)?$/.test(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function parseTime(raw: string): Date | null {
  const value = raw.trim();
  if (!value) return null;
  let match = value.match(
    /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (match) {
    const date = new Date(
      Date.UTC(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
        Number(match[4] ?? 0),
        Number(match[5] ?? 0),
        Number(match[6] ?? 0),
      ),
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }
  match = value.match(
    /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (match) {
    const date = new Date(
      Date.UTC(
        Number(match[3]),
        Number(match[2]) - 1,
        Number(match[1]),
        Number(match[4] ?? 0),
        Number(match[5] ?? 0),
        Number(match[6] ?? 0),
      ),
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function detectDelimiter(line: string): string {
  let inQuotes = false;
  const counts = new Map<string, number>([
    [",", 0],
    [";", 0],
    ["\t", 0],
  ]);
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && counts.has(char)) {
      counts.set(char, (counts.get(char) ?? 0) + 1);
    }
  }
  let best = ",";
  let bestCount = 0;
  for (const [delimiter, count] of counts) {
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return best;
}

function firstContentLine(text: string): string {
  const source = text.replace(/^\uFEFF/, "");
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trimStart();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) continue;
    return line;
  }
  return "";
}

export function splitCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const source = text.replace(/^\uFEFF/, "");

  const finishRow = () => {
    row.push(cell);
    cell = "";
    const first = row[0]?.trimStart() ?? "";
    const comment = first.startsWith("#") || first.startsWith("//");
    if (!comment && row.some((value) => value.trim() !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i++;
      finishRow();
      continue;
    }
    cell += char;
  }
  if (cell.length > 0 || row.length > 0) finishRow();
  return rows;
}

function looksLikeHeader(cells: string[]): boolean {
  if (parseTime(cells[0] ?? "")) return false;
  return cells.some((cell) => {
    const name = normHeader(cell);
    return name in ALIASES || name === "type";
  });
}

function uniqueKey(map: Record<string, string>, key: string): string {
  if (!(key in map)) return key;
  let index = 2;
  while (`${key} (${index})` in map) index += 1;
  return `${key} (${index})`;
}

function blankRow(): Omit<LogRow, "line" | "extra" | "fields"> {
  return {
    time: null,
    timeRaw: "",
    event: "",
    symbol: "",
    magic: null,
    comment: "",
    ticket: "",
    side: "",
    volume: null,
    price: null,
    sl: null,
    tp: null,
    profit: null,
    balance: null,
    reason: "",
    detail: "",
  };
}

function assign(row: Omit<LogRow, "line" | "extra" | "fields">, field: Field, raw: string) {
  const value = raw.trim();
  if (field === "time") {
    row.timeRaw = value;
    row.time = parseTime(value);
    return;
  }
  if (NUMBER_FIELDS.has(field)) {
    const number = parseNumber(value);
    if (field === "magic") row.magic = number;
    if (field === "volume") row.volume = number;
    if (field === "price") row.price = number;
    if (field === "sl") row.sl = number;
    if (field === "tp") row.tp = number;
    if (field === "profit") row.profit = number;
    if (field === "balance") row.balance = number;
    return;
  }
  if (field === "event") row.event = value;
  if (field === "symbol") row.symbol = value;
  if (field === "comment") row.comment = value;
  if (field === "ticket") row.ticket = value;
  if (field === "side") row.side = value;
  if (field === "reason") row.reason = value;
  if (field === "detail") row.detail = value;
}

export function parseLog(text: string): ParseResult {
  const warnings: LogWarning[] = [];
  const table = splitCsv(text, detectDelimiter(firstContentLine(text)));
  if (table.length === 0) return { rows: [], headers: [], warnings };

  const headerRow = looksLikeHeader(table[0]);
  const headers = headerRow ? table[0].map((cell) => cell.trim()) : POSITIONAL.map(String);
  const data = headerRow ? table.slice(1) : table;
  if (!headerRow) warnings.push({ code: "no-header" });

  const columnField = new Map<number, Field>();
  const used = new Set<Field>();
  headers.forEach((header, index) => {
    const name = normHeader(header);
    const field = ALIASES[name];
    if (!field) return;
    if (used.has(field)) {
      warnings.push({ code: "duplicate-column", detail: header });
      return;
    }
    used.add(field);
    columnField.set(index, field);
  });

  headers.forEach((header, index) => {
    if (normHeader(header) !== "type" || columnField.has(index)) return;
    if (!used.has("event")) {
      columnField.set(index, "event");
      used.add("event");
      return;
    }
    if (!used.has("side")) {
      columnField.set(index, "side");
      used.add("side");
    }
  });

  if (!headerRow) {
    POSITIONAL.forEach((field, index) => columnField.set(index, field));
  }

  const rows: LogRow[] = [];
  data.forEach((cells, index) => {
    if (headerRow && cells.length === headers.length) {
      const repeated = cells.every(
        (cell, cellIndex) => normHeader(cell) === normHeader(headers[cellIndex] ?? ""),
      );
      if (repeated) return;
    }

    const row = blankRow();
    const fields: Record<string, string> = {};
    const extra: Record<string, string> = {};
    const width = Math.max(headers.length, cells.length);

    for (let cellIndex = 0; cellIndex < width; cellIndex++) {
      const raw = cells[cellIndex] ?? "";
      const header = headers[cellIndex] ?? `kolonne_${cellIndex + 1}`;
      const key = uniqueKey(fields, header || `kolonne_${cellIndex + 1}`);
      fields[key] = raw;
      const field = columnField.get(cellIndex);
      if (field) assign(row, field, raw);
      else extra[key] = raw;
    }

    if (row.timeRaw && !row.time) {
      warnings.push({ code: "bad-time", line: index + 1, detail: row.timeRaw });
    }

    rows.push({ ...row, line: index + 1, fields, extra });
  });

  return { rows, headers, warnings };
}

export function parseLogs(texts: string[]): ParseResult {
  const parsed = texts.map(parseLog);
  return {
    rows: parsed.flatMap((result) => result.rows),
    headers: parsed[0]?.headers ?? [],
    warnings: parsed.flatMap((result) => result.warnings),
  };
}
