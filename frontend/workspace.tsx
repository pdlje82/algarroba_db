import { useEffect, useLayoutEffect, useState } from "react";
import { APPEARANCE_KEY, type ThemePreference, type Theme } from "./appearance";
export function useAppearance() {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    try {
      const v = localStorage.getItem(APPEARANCE_KEY);
      if (v === "light" || v === "dark") return v;
    } catch {}
    return "system";
  });
  const [system, setSystem] = useState<Theme>(() =>
    matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );
  const theme = preference === "system" ? system : preference;
  useEffect(() => {
    const q = matchMedia("(prefers-color-scheme: dark)"),
      changed = () => setSystem(q.matches ? "dark" : "light");
    q.addEventListener("change", changed);
    return () => q.removeEventListener("change", changed);
  }, []);
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try {
      localStorage.setItem(APPEARANCE_KEY, preference);
    } catch {}
  }, [preference, theme]);
  return { preference, setPreference, theme };
}
export function useFullScreen(message: (s: string) => void) {
  const [fullscreen, setFullscreen] = useState(!!document.fullscreenElement);
  useEffect(() => {
    const change = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  const toggle = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      message(
        "Full screen is unavailable here. Open the local app in Edge or Chrome.",
      );
    }
  };
  return { fullscreen, toggle };
}
