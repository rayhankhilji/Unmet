import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkTheme, contrastRatio, parseTokens } from "./contrast.ts";

describe("contrast", () => {
  it("computes WCAG ratios", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });

  it("parses only hex tokens from the named block", () => {
    const tokens = parseTokens(
      ":root {\n  --a: #FFFFFF;\n  --b: rgba(0,0,0,.4);\n}\n.dark {\n  --a: #000000;\n}",
      ":root",
    );
    expect(Object.fromEntries(tokens)).toEqual({ a: "#ffffff" });
  });

  it("every documented pair in globals.css meets AA in both themes", () => {
    const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
    const results = [
      ...checkTheme(parseTokens(css, ":root"), "light"),
      ...checkTheme(parseTokens(css, ".dark"), "dark"),
    ];
    expect(results.filter((r) => !r.ok)).toEqual([]);
  });
});
