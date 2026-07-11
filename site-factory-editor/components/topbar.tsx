"use client";

// Topbar della shell: ricerca clienti globale (l'UNICA — lo stato vive
// nell'URL ?q= della home) + toggle tema. ⌘K o / da qualunque pagina
// focalizzano la ricerca; da pagine diverse dalla home si naviga alla home
// filtrata. Sulla home il filtro è live (replace debounced: la pagina è
// dinamica e rilegge da disco).

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState(params.get("q") ?? "");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isMac, setIsMac] = useState(true);

  // Tiene il campo allineato quando si arriva sulla home con ?q= (o si torna).
  useEffect(() => {
    if (pathname === "/") setQ(params.get("q") ?? "");
  }, [pathname, params]);

  useEffect(() => {
    setIsMac(!/win|linux/i.test(navigator.platform + navigator.userAgent));
    function onKey(e: KeyboardEvent) {
      const inField =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement instanceof HTMLSelectElement;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
        input.current?.select();
      } else if (e.key === "/" && !inField) {
        e.preventDefault();
        input.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function applica(value: string, immediato = false) {
    setQ(value);
    const url = value.trim() ? `/?q=${encodeURIComponent(value.trim())}` : "/";
    if (debounce.current) clearTimeout(debounce.current);
    if (pathname === "/") {
      // live sulla home, con debounce per non rileggere il disco a ogni tasto
      if (immediato) router.replace(url);
      else debounce.current = setTimeout(() => router.replace(url), 250);
    } else if (immediato) {
      router.push(url);
    }
  }

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface">
      <div className="flex h-14 items-center gap-4 px-6">
        <form
          className="relative max-w-md flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            applica(q, true);
          }}
          role="search"
        >
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
          <input
            ref={input}
            type="search"
            value={q}
            onChange={(e) => applica(e.target.value)}
            placeholder="Cerca cliente per nome, referente o telefono…"
            aria-label="Cerca clienti"
            className="!rounded-full !pr-12 !pl-9"
          />
          <kbd className="mono pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded border border-line bg-raise px-1.5 py-0.5 text-[10px] text-faint">
            {isMac ? "⌘K" : "Ctrl K"}
          </kbd>
        </form>
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
