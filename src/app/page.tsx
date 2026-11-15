import { connection } from "next/server";
import { Dashboard } from "@/components/dashboard";
import { loadLog } from "@/lib/load-log";

export default async function Page() {
  await connection();
  return <Dashboard initial={loadLog()} />;
}
