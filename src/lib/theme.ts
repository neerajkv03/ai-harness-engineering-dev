const KEY = "theme";

const apply = (dark: boolean) => document.documentElement.classList.toggle("dark", dark);

function stored(): boolean | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === null ? null : v === "dark";
  } catch {
    return null;
  }
}

/** Saved choice wins; otherwise dark. */
export function initTheme() {
  apply(stored() ?? true);
}

export function setTheme(dark: boolean) {
  apply(dark);
  try {
    localStorage.setItem(KEY, dark ? "dark" : "light");
  } catch {
    // storage blocked: choice lasts for this page load only
  }
}
