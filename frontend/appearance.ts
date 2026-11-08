export type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";
export const APPEARANCE_KEY = "kgb:appearance:v1";
export const palettes = {
  light: {
    text: "#203d32",
    muted: "#59695f",
    canvas: "#f5f4ee",
    layerLabel: "#dce8df",
    edge: "#93a69b",
    active: "#287e91",
    border: "#8c9e90",
    centre: "#f3e6c9",
    fills: {
      ecosystem: "#e5eee5",
      technology: "#e2eef2",
      funding: "#f6ead4",
      other: "#e9eee7",
    },
  },
  dark: {
    text: "#e3eee6",
    muted: "#b0c3b6",
    canvas: "#131d1a",
    layerLabel: "#2c4538",
    edge: "#577467",
    active: "#9de8f2",
    border: "#7b9987",
    centre: "#594a28",
    fills: {
      ecosystem: "#293f32",
      technology: "#253e49",
      funding: "#493d29",
      other: "#2e3b32",
    },
  },
};
