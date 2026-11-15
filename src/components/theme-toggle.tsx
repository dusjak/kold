"use client";

import { useSyncExternalStore } from "react";

type Mode = "light" | "dark" | "system";

function readMode(): Mode {
  const stored = localStorage.getItem("kold-theme");
  if (stored === "light" || stored === "dark") return stored;
  return "system";
}

function themeFor(mode: Mode): "light" | "dark" {
  if (mode === "light" || mode === "dark") return mode;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyMode(mode: Mode) {
  const root = document.documentElement;
  root.setAttribute("data-theme", themeFor(mode));
  root.setAttribute("data-theme-mode", mode);
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handle = () => {
    applyMode(readMode());
    onChange();
  };
  media.addEventListener("change", handle);
  window.addEventListener("kold-theme", handle);
  return () => {
    media.removeEventListener("change", handle);
    window.removeEventListener("kold-theme", handle);
  };
}

function serverMode(): Mode {
  return "system";
}

const OPTIONS: { id: Mode; label: string }[] = [
  { id: "system", label: "System" },
  { id: "light", label: "Lys" },
  { id: "dark", label: "Mørk" },
];

export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribe, readMode, serverMode);

  function choose(next: Mode) {
    if (next === "system") localStorage.removeItem("kold-theme");
    else localStorage.setItem("kold-theme", next);
    applyMode(next);
    window.dispatchEvent(new Event("kold-theme"));
  }

  return (
    <div className="seg" role="group" aria-label="Tema">
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          className={mode === option.id ? "on" : undefined}
          aria-pressed={mode === option.id}
          onClick={() => choose(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
