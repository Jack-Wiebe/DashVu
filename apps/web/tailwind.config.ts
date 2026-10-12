import type { Config } from "tailwindcss";
import preset from "@dashvu/config/tailwind-preset";

const config = {
  presets: [preset as Config],
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
} satisfies Config;

export default config;
