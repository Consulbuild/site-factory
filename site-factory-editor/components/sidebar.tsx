"use client";

// Sidebar della shell (DESIGN-REFACTOR §4): navigazione principale con voce
// attiva a pill + barretta, gruppo Fabbrica con sotto-voce Riferimenti,
// Impostazioni in fondo. Lo slot children (in basso) ospita la card
// «Agenti al lavoro» della status bar. Sotto lg collassa a sole icone.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Factory, BookMarked, Settings, type LucideIcon } from "lucide-react";

type Voce = {
  href: string;
  label: string;
  icon: LucideIcon;
  attiva: (pathname: string) => boolean;
  sub?: boolean;
};

const VOCI: Voce[] = [
  {
    href: "/",
    label: "Clienti",
    icon: Users,
    attiva: (p) => p === "/" || p.startsWith("/clienti"),
  },
  {
    href: "/fabbrica",
    label: "Fabbrica",
    icon: Factory,
    attiva: (p) => p.startsWith("/fabbrica") && !p.startsWith("/fabbrica/riferimenti"),
  },
  {
    href: "/fabbrica/riferimenti",
    label: "Riferimenti",
    icon: BookMarked,
    attiva: (p) => p.startsWith("/fabbrica/riferimenti"),
    sub: true,
  },
];

function VoceNav({ voce, pathname }: { voce: Voce; pathname: string }) {
  const attiva = voce.attiva(pathname);
  const Icon = voce.icon;
  return (
    <Link
      href={voce.href}
      aria-current={attiva ? "page" : undefined}
      className={`relative flex items-center gap-2.5 rounded-ctl px-3 py-2 text-sm transition-colors duration-150 max-lg:justify-center max-lg:px-2 ${
        voce.sub ? "lg:ml-3" : ""
      } ${attiva ? "bg-brand-dim font-semibold text-brand" : "font-medium text-muted hover:bg-raise hover:text-ink"}`}
    >
      {attiva && <span aria-hidden className="absolute top-2 bottom-2 -left-3 w-[3px] rounded-full bg-brand" />}
      <Icon aria-hidden className="size-[18px] shrink-0" strokeWidth={attiva ? 2.25 : 2} />
      <span className="truncate max-lg:hidden">{voce.label}</span>
    </Link>
  );
}

export function Sidebar({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-line bg-surface px-3 py-4 max-lg:w-16 max-lg:px-2">
      <Link href="/" className="flex items-center gap-2 px-3 font-semibold tracking-tight max-lg:justify-center max-lg:px-0">
        <span className="inline-block size-2 shrink-0 rounded-full bg-brand" aria-hidden />
        <span className="max-lg:hidden">Site-factory</span>
      </Link>
      <nav className="mt-6 flex flex-col gap-1" aria-label="Aree">
        {VOCI.map((v) => (
          <VoceNav key={v.href} voce={v} pathname={pathname} />
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-3">
        {children}
        <VoceNav
          voce={{ href: "/impostazioni", label: "Impostazioni", icon: Settings, attiva: (p) => p.startsWith("/impostazioni") }}
          pathname={pathname}
        />
      </div>
    </aside>
  );
}
