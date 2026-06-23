import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme, Platform } from "react-native";

export type ThemeMode = "dark" | "light";

type ThemeCtx = {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  dark: boolean;
};

const ThemeContext = createContext<ThemeCtx>({
  mode: "dark",
  setMode: () => {},
  dark: true,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(system === "light" ? "light" : "dark");

  const dark = mode === "dark";

  useEffect(() => {
    if (Platform.OS !== "web") return;
    try {
      const root = (globalThis as any).window?.document?.documentElement;
      if (!root) return;
      if (dark) root.classList.add("dark");
      else root.classList.remove("dark");
    } catch {}
  }, [dark]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, dark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
