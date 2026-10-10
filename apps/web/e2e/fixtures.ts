import { test as base, expect } from "@playwright/test";

type Fixtures = { allowedConsoleErrors: RegExp[]; consoleErrors: string[] };

/**
 * Every spec fails if the page logs a console error (TESTING_GUIDE §7). A spec that forces
 * a failing request can allow the browser's own network message with `allowedConsoleErrors`.
 */
export const test = base.extend<Fixtures>({
  allowedConsoleErrors: [[], { option: true }],
  consoleErrors: [
    async ({ page, allowedConsoleErrors }, use) => {
      const errors: string[] = [];
      const record = (text: string) => {
        if (!allowedConsoleErrors.some((pattern) => pattern.test(text))) errors.push(text);
      };
      page.on("console", (msg) => {
        if (msg.type() === "error") record(msg.text());
      });
      page.on("pageerror", (error) => record(error.message));
      await use(errors);
      expect(errors, "console errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
