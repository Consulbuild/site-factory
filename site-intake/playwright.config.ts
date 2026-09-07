import { defineConfig, devices } from "@playwright/test";

// I test girano contro `astro dev` (serve il plugin dev/inbox.mjs per ricevere
// risposte e file) su una porta dedicata. Tre viewport: telefono, tablet, computer.
// Le schermate (@schermate) non sono baseline pixel: sono evidenza per la critique.
export default defineConfig({
  testDir: "./tests",
  timeout: 90_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  webServer: {
    command: "npm run dev -- --port 4391 --host 127.0.0.1",
    url: "http://127.0.0.1:4391/",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  use: {
    baseURL: "http://127.0.0.1:4391",
    locale: "it-IT",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "telefono", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
    { name: "tablet", use: { ...devices["iPad Mini"], defaultBrowserType: "chromium" } },
    { name: "computer", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
  ],
});
