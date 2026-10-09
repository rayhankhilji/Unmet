import { expect, test } from "./fixtures.ts";
import { expectNoA11yViolations } from "./helpers/a11y.ts";

test("the home page renders without accessibility violations", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Unmet/);
  await expectNoA11yViolations(page);
});
