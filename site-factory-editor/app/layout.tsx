import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Site-factory",
  description: "Console della pipeline Site-factory — ConsulBuild",
};

// No-flash: imposta data-theme PRIMA del paint (localStorage o preferenza di
// sistema), così non c'è lampo del tema sbagliato al caricamento.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <header className="border-b border-line">
          <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="inline-block size-2 rounded-full bg-brand" aria-hidden />
              Site-factory
            </Link>
            <div className="flex items-center gap-5">
              <nav className="flex items-center gap-4 text-sm" aria-label="Aree">
                <Link href="/" className="text-muted hover:text-ink">
                  Clienti
                </Link>
                <Link href="/fabbrica" className="text-muted hover:text-ink">
                  Fabbrica
                </Link>
              </nav>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
