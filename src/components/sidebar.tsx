"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { oversiktConfig } from "@/config/oversikt";
import { Ikon } from "./ikon";

const AV = [
  { navn: "bot", label: "Bot" },
  { navn: "butikk", label: "Butikk" },
  { navn: "lenke", label: "Tilkobling" },
] as const;

export function Sidebar() {
  const path = usePathname();
  return (
    <div className="sidekolonne">
      <nav className="sidefelt" aria-label="Hovedmeny">
        <div className="profil" aria-hidden="true">
          <div className="profil-indre">{oversiktConfig.initialer}</div>
          <span className="aktivitet" />
        </div>
        <hr className="deler" />
        <div className="nav">
          <NavLenke href="/" navn="oversikt" label="Oversikt" aktiv={path === "/"} />
          {AV.slice(0, 2).map((item) => (
            <NavAv key={item.navn} {...item} />
          ))}
          <NavLenke href="/historikk" navn="historikk" label="Historikk" aktiv={path.startsWith("/historikk")} />
          <NavAv navn="lenke" label="Tilkobling" />
        </div>
        <hr className="deler" />
        <NavAv navn="innstillinger" label="Innstillinger" />
      </nav>
      <Image className="logo" src="/brand/logo-k3bla.svg" alt="kold" width={66} height={27} unoptimized />
    </div>
  );
}

function NavLenke({ href, navn, label, aktiv }: { href: string; navn: string; label: string; aktiv: boolean }) {
  return (
    <Link className={aktiv ? "nav-knapp paa" : "nav-knapp"} href={href} aria-label={label} aria-current={aktiv ? "page" : undefined}>
      <Ikon navn={navn} />
    </Link>
  );
}

function NavAv({ navn, label }: { navn: string; label: string }) {
  return (
    <button type="button" className="nav-knapp" disabled aria-disabled="true" aria-label={`${label}, ikke med i denne versjonen`}>
      <Ikon navn={navn} />
    </button>
  );
}
