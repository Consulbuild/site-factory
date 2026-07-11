import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { RunsProvider } from "@/components/run-provider";
import { StatusBar } from "@/components/status-bar";
import { AgentiCard } from "@/components/agenti-card";

// Il carattere del riferimento visivo, self-hosted da next/font (nessuna
// request esterna a runtime); esposto come var per il token --font-sans.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Site-factory",
  description: "Console della pipeline Site-factory — ConsulBuild",
};

// No-flash: imposta data-theme PRIMA del paint (localStorage o preferenza di
// sistema), così non c'è lampo del tema sbagliato al caricamento.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" className={`h-full antialiased ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <RunsProvider>
          <div className="flex min-h-screen">
            <Sidebar>
              <AgentiCard />
            </Sidebar>
            <div className="flex min-w-0 flex-1 flex-col">
              <Suspense>
                <Topbar />
              </Suspense>
              <main className="mx-auto w-full max-w-5xl px-6 py-8">{children}</main>
            </div>
          </div>
          <StatusBar />
        </RunsProvider>
      </body>
    </html>
  );
}
