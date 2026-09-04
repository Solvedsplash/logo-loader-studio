"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "lls-theme";

/**
 * Runs before React hydrates and before first paint, so the correct theme class
 * is already on <html>. Without this the page paints in the default theme and
 * then snaps, which reads as a bug.
 */
export function ThemeScript() {
  const js = `(function(){try{
    var s=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
    var d=window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = s === 'dark' || (s !== 'light' && d);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  }catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: js }} suppressHydrationWarning />;
}

const ThemeContext = createContext({ theme: "dark", setTheme: () => {}, toggle: () => {} });

export function ThemeProvider({ children }) {
  // Initialised from the DOM rather than a constant, because ThemeScript has
  // already decided the real value by the time this runs.
  const [theme, setThemeState] = useState("dark");

  useEffect(() => {
    setThemeState(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    const dark = next === "dark";
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode — the choice just won't persist */
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  // Follow the system while the user hasn't made an explicit choice.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => {
      let stored = null;
      try { stored = localStorage.getItem(STORAGE_KEY); } catch {}
      if (stored) return;
      setThemeState(e.matches ? "dark" : "light");
      document.documentElement.classList.toggle("dark", e.matches);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
