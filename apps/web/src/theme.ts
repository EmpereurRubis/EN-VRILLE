import { useEffect, useLayoutEffect, useState } from "react";
import { desktop } from "./backend";

export type ThemePreference = "light" | "dark" | "system";
const STORAGE_KEY = "vrille-theme";
const SYSTEM_QUERY = "(prefers-color-scheme: dark)";

function readPreference(): ThemePreference {
  const native = desktop?.preferences?.theme;
  if (native === "light" || native === "dark" || native === "system") return native;
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(readPreference);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia(SYSTEM_QUERY).matches,
  );
  const isDark = preference === "system" ? systemDark : preference === "dark";

  useEffect(() => {
    const media = window.matchMedia(SYSTEM_QUERY);
    const changed = () => setSystemDark(media.matches);
    changed();
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);

  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        setPreference(readPreference());
      }
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, []);

  useLayoutEffect(() => {
    const theme = isDark ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", isDark ? "#111113" : "#f8f5ee");
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // The chosen theme remains usable when browser storage is unavailable.
    }
    void desktop?.setPreferences?.({ theme: preference }).catch(() => {});
  }, [isDark, preference]);

  return { preference, setPreference, isDark };
}
