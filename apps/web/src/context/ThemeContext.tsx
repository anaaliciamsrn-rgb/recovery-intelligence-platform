import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ColorScheme = "light" | "dark";

export interface BrandConfig {
  productName: string;
  logoUrl: string | null;
  primaryColor: string;
  primaryColorHover: string;
}

const DEFAULT_BRAND: BrandConfig = {
  productName: import.meta.env.VITE_PRODUCT_NAME ?? "Recovery Intelligence Platform",
  logoUrl: null,
  primaryColor: import.meta.env.VITE_PRIMARY_COLOR ?? "#4f46e5",
  primaryColorHover: "#4338ca",
};

const COLOR_SCHEME_STORAGE_KEY = "rip.colorScheme";

interface ThemeContextValue {
  brand: BrandConfig;
  /** White-label: troca marca/logo/cor primária em runtime (ex.: por tenant), sem rebuild. Aplica via CSS custom properties. */
  setBrand: (brand: Partial<BrandConfig>) => void;
  colorScheme: ColorScheme;
  toggleColorScheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyBrandToDocument(brand: BrandConfig): void {
  const root = document.documentElement;
  root.style.setProperty("--color-primary", brand.primaryColor);
  root.style.setProperty("--color-primary-hover", brand.primaryColorHover);
}

function readInitialColorScheme(): ColorScheme {
  const stored = localStorage.getItem(COLOR_SCHEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [brand, setBrandState] = useState<BrandConfig>(DEFAULT_BRAND);
  const [colorScheme, setColorScheme] = useState<ColorScheme>(readInitialColorScheme);

  useEffect(() => applyBrandToDocument(brand), [brand]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", colorScheme);
    localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, colorScheme);
  }, [colorScheme]);

  const setBrand = useCallback((partial: Partial<BrandConfig>) => {
    setBrandState((current) => ({ ...current, ...partial }));
  }, []);

  const toggleColorScheme = useCallback(() => {
    setColorScheme((current) => (current === "light" ? "dark" : "light"));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ brand, setBrand, colorScheme, toggleColorScheme }),
    [brand, setBrand, colorScheme, toggleColorScheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme() precisa estar dentro de <ThemeProvider>");
  return context;
}
