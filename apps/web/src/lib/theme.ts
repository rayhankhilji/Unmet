export const THEME_STORAGE_KEY = "unmet-theme";
export type Theme = "light" | "dark";

/**
 * Runs before first paint (inline in <head>) so the page never flashes the wrong theme.
 * A stored choice wins; otherwise follow prefers-color-scheme (DESIGN_SYSTEM §12).
 */
export const themeScript = `(function(){var d=false;try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches}catch(e){d=matchMedia("(prefers-color-scheme: dark)").matches}if(d)document.documentElement.classList.add("dark")})();`;

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable (private mode, blocked site data); the toggle still works for this visit.
  }
}
