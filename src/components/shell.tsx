"use client";

import type { ReactNode } from "react";
import type { LoadedLog } from "@/lib/load-log";
import { LogProvider } from "./log-context";
import { Sidebar } from "./sidebar";

export function Shell({ initial, children }: { initial: LoadedLog; children: ReactNode }) {
  return (
    <LogProvider initial={initial}>
      <div className="ramme">
        <div className="rad">
          <Sidebar />
          {children}
        </div>
      </div>
    </LogProvider>
  );
}
