import { expect, test } from "./fixtures.ts";
import { expectNoA11yViolations } from "./helpers/a11y.ts";

const SECTIONS = [
  "What Unmet does",
  "The corpus",
  "Pipeline",
  "What the model does, and what it doesn't",
  "Evidence Strength",
  "Limitations",
  "How this would sit on a production video index",
];

test("about shows the methodology and live corpus numbers from the seeded data", async ({
  page,
}) => {
  await page.goto("/about");
  for (const name of SECTIONS)
    await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();

  const stats = page.getByRole("region", { name: "Corpus statistics" });
  await expect(stats.getByText("Videos", { exact: true })).toBeVisible();
  await expect(stats.locator("dd").first()).toHaveText("20");
  await expect(stats.locator("dd").nth(1)).toHaveText("9");
  await expect(stats.locator("dd").nth(2)).toHaveText("46");
  await expect(stats.getByText(/synthetic fixture written for testing/)).toBeVisible();
  await expectNoA11yViolations(page);
});

test.describe("when the stats endpoint fails", () => {
  test.use({
    allowedConsoleErrors: [/Failed to load resource: the server responded with a status of 503/],
  });

  test("T-F14-AC2 every static section still renders and the block says Stats unavailable", async ({
    page,
  }) => {
    await page.route("**/api/v1/corpus/stats", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "STATS_UNAVAILABLE", message: "Stats unavailable", details: {} },
        }),
      }),
    );
    await page.goto("/about");
    await expect(page.getByText("Stats unavailable")).toBeVisible();
    for (const name of SECTIONS)
      await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
    await expectNoA11yViolations(page);
  });
});

test("the home page links to how it works", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "How it works" }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole("link", { name: "About", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
});
