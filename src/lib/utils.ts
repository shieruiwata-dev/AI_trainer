import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** ローカルタイムゾーンで YYYY-MM-DD を返す */
export function todayStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDateJa(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export function uid(): string {
  return crypto.randomUUID();
}

/** 整数を3桁区切りでフォーマット */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("ja-JP").format(value);
}
