import { expect, test } from "./fixtures.ts";
import { expectNoA11yViolations } from "./helpers/a11y.ts";

// Baselines: <page>-<state>-<width>-<theme>.png (TESTING_GUIDE §5). Refresh only for an
// intentional UI change: pnpm test:e2e -- --update-snapshots e2e/visual.spec.ts
const WIDTHS = [1440, 390] as const;
const THEMES = ["light", "dark"] as const;

for (const width of WIDTHS) {
  for (const theme of THEMES) {
    test(`shell on home at ${width}px, ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^(?!.*dark)/);
      await expectNoA11yViolations(page);
      await expect(page).toHaveScreenshot(`home-default-${width}-${theme}.png`, { fullPage: true });
    });
  }
}

test("the theme toggle switches and remembers the choice", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle dark mode" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("390 px has no horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});
