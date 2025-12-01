import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export const generateId = () => Math.random().toString(36).substr(2, 9);
export const getTodayStr = () => new Date().toISOString().split('T')[0];
