import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Gate L1: WCAG 2.x A/AA via axe-core su ogni /anteprima/[preset], a entrambi
// i viewport della matrice. Run separato dal VRT: `npm run test:a11y`.
// Le violazioni sui preset esistenti sono input del re-audit M4, non da
// silenziare qui: questo test è anche il gate dei candidati della fabbrica.

test("@a11y WCAG A/AA su anteprima", async ({ page }, testInfo) => {
  const preset = testInfo.project.name.replace(/-\d+$/, "");
  await page.goto(`/anteprima/${preset}/`, { waitUntil: "networkidle" });
  const risultati = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  const sintesi = risultati.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.length} nodi — es. ${v.nodes[0]?.target}`,
  );
  expect(sintesi, sintesi.join("\n")).toEqual([]);
});
