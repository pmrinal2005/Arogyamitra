import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function riskColor(bucket: "low" | "moderate" | "elevated"): string {
  return { low: "#16a34a", moderate: "#d97706", elevated: "#dc2626" }[bucket];
}

export function riskLabel(bucket: "low" | "moderate" | "elevated"): string {
  return { low: "Low", moderate: "Moderate", elevated: "Elevated" }[bucket];
}

export function aqiLabel(aqi: number | null | undefined): string {
  if (aqi == null) return "—";
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy (sensitive)";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

export function timeOfDayBucket(d = new Date()): string {
  const h = d.getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 22) return "evening";
  return "late_night";
}

export function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short", day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function coarsen(v: number, dp = 2): number {
  const f = Math.pow(10, dp);
  return Math.round(v * f) / f;
}
