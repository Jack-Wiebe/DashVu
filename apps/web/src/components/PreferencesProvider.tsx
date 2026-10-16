"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { trpc } from "@/lib/trpc/client";
import { DEFAULT_THEME, resolveTheme, THEMES } from "@/lib/themes";

interface PreferencesContextValue {
  theme: string;
  setTheme: (theme: string) => void;
  reduceMotion: boolean;
  setReduceMotion: (value: boolean) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
}

export function PreferencesProvider({
  initialTheme,
  initialSettings,
  children,
}: {
  initialTheme?: string | null;
  initialSettings?: Record<string, unknown> | null;
  children: ReactNode;
}) {
  const update = trpc.user.updatePreferences.useMutation();
  const [theme, setThemeState] = useState(initialTheme ?? DEFAULT_THEME);
  const [reduceMotion, setReduceMotionState] = useState(initialSettings?.reduceMotion === true);

  useEffect(() => {
    const root = document.documentElement;
    const active = resolveTheme(theme).className;
    for (const definition of THEMES) {
      root.classList.toggle(definition.className, definition.className === active);
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = reduceMotion ? "true" : "false";
  }, [reduceMotion]);

  const value: PreferencesContextValue = {
    theme,
    setTheme: (next) => {
      setThemeState(next);
      update.mutate({ theme: next });
    },
    reduceMotion,
    setReduceMotion: (next) => {
      setReduceMotionState(next);
      update.mutate({ settings: { reduceMotion: next } });
    },
  };

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
