import type { ReactNode } from "react";
import { connection } from "next/server";
import { Shell } from "@/components/shell";
import { loadLog } from "@/lib/load-log";

export default async function KoldLayout({ children }: { children: ReactNode }) {
  await connection();
  return <Shell initial={loadLog()}>{children}</Shell>;
}
