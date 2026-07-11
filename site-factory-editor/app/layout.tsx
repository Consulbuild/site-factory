import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Tema deciso lato server dal cookie: niente flash per chi ha già scelto e
  // nessuno <script> inline nell'albero React (che React 19 segnalerebbe a
  // ogni render). Primo accesso senza cookie → chiaro (il riferimento è chiaro).
  const tema = (await cookies()).get("theme")?.value === "dark" ? "dark" : "light";

  return (
    <html lang="it" data-theme={tema} className={`h-full antialiased ${inter.variable}`}>
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
