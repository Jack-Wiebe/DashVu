import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const menuSurfaceClass =
  "rounded-md border border-zinc-800 bg-zinc-900 text-zinc-100 shadow-lg";
