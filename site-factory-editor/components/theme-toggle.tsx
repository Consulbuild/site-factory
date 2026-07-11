"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

// Toggle tema chiaro/scuro. Lo stato autorevole vive nel cookie `theme`, letto
// server-side dal layout (niente flash, niente <script> inline). Qui: aggiorno
// document.documentElement per il feedback istantaneo E scrivo il cookie perché
// il prossimo render server parta già giusto.

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme((document.documentElement.dataset.theme as Theme) ?? "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    // Cookie di sessione lunga (1 anno), leggibile dal server al prossimo load.
    document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax`;
    setTheme(next);
  }

  return (
    <button
      onClick={toggle}
      className="inline-flex size-8 items-center justify-center rounded-full border border-line text-muted transition-colors duration-150 hover:border-line2 hover:text-ink"
      aria-label={theme === "dark" ? "Passa al tema chiaro" : "Passa al tema scuro"}
      title={theme === "dark" ? "Tema chiaro" : "Tema scuro"}
    >
      {theme === "dark" ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </button>
  );
}
