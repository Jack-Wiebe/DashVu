export interface ThemeDefinition {
  id: string;
  label: string;
  className: string;
}

/**
 * Available themes. Adding a theme is a registry entry plus a matching class in
 * `globals.css`; the stored preference is an open string so new themes do not
 * require a schema change.
 */
export const THEMES: ThemeDefinition[] = [
  { id: "dark", label: "Dark", className: "dark" },
  { id: "light", label: "Light", className: "light" },
];

export const DEFAULT_THEME = "dark";

export function resolveTheme(id: string | null | undefined): ThemeDefinition {
  return (
    THEMES.find((theme) => theme.id === id) ??
    THEMES.find((theme) => theme.id === DEFAULT_THEME) ??
    THEMES[0]
  );
}

export function themeClassName(id: string | null | undefined): string {
  return resolveTheme(id).className;
}
