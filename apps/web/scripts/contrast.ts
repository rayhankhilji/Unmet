import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Checks every text/background and boundary pair in globals.css against WCAG 2.2 AA:
// text ≥ 4.5:1, UI boundaries ≥ 3:1 (DESIGN_SYSTEM §2, §13). Exits non-zero on any miss.

export type Pair = { fg: string; bg: string; min: number };

export const PAIRS: Pair[] = [
  ...["background", "surface", "surface-raised"].flatMap((bg) => [
    { fg: "text", bg, min: 4.5 },
    { fg: "text-muted", bg, min: 4.5 },
    { fg: "info", bg, min: 4.5 },
    { fg: "success", bg, min: 4.5 },
    { fg: "warning", bg, min: 4.5 },
    { fg: "danger", bg, min: 4.5 },
    { fg: "border-strong", bg, min: 3 },
    { fg: "focus-ring", bg, min: 3 },
  ]),
  { fg: "primary-foreground", bg: "primary", min: 4.5 },
  { fg: "text", bg: "highlight", min: 4.5 },
  ...["strong", "emerging", "weak", "rejected"].map((v) => ({
    fg: `verdict-${v}-fg`,
    bg: `verdict-${v}-bg`,
    min: 4.5,
  })),
];

export function parseTokens(css: string, selector: ":root" | ".dark"): Map<string, string> {
  const escaped = selector.replace(".", "\\.");
  const block = new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`).exec(css)?.[1];
  if (!block) throw new Error(`No ${selector} block found`);
  const tokens = new Map<string, string>();
  for (const match of block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    const [, name, hex] = match;
    if (name && hex) tokens.set(name, hex.toLowerCase());
  }
  return tokens;
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

export type Result = Pair & { theme: string; ratio: number; ok: boolean };

export function checkTheme(tokens: Map<string, string>, theme: string): Result[] {
  return PAIRS.map((pair) => {
    const fg = tokens.get(pair.fg);
    const bg = tokens.get(pair.bg);
    if (!fg || !bg) throw new Error(`${theme}: missing token --${fg ? pair.bg : pair.fg}`);
    const ratio = contrastRatio(fg, bg);
    return { ...pair, theme, ratio, ok: ratio >= pair.min };
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  const results = [
    ...checkTheme(parseTokens(css, ":root"), "light"),
    ...checkTheme(parseTokens(css, ".dark"), "dark"),
  ];
  for (const r of results) {
    const mark = r.ok ? "ok  " : "FAIL";
    console.log(
      `${mark} ${r.theme.padEnd(5)} ${`${r.fg} on ${r.bg}`.padEnd(46)} ${r.ratio.toFixed(2).padStart(5)} (min ${r.min})`,
    );
  }
  const failures = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failures.length}/${results.length} pairs pass.`);
  if (failures.length > 0) process.exitCode = 1;
}
