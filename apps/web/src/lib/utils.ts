import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const menuSurfaceClass = "rounded-md border border-border bg-card text-foreground shadow-lg";
