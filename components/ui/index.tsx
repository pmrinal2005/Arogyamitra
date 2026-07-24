"use client";
// Small, accessible, dependency-light UI primitives (no external UI kit needed).
// Tailwind preflight is disabled globally, so these carry their own base styling.
import * as React from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------- Card
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pt-5 pb-2", className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-sm font-semibold uppercase tracking-wide text-slate-500", className)}
      {...props}
    />
  );
}
export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}

// ---------------------------------------------------------------- Button
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const styles: Record<ButtonVariant, string> = {
    primary: "bg-brand-700 text-white hover:bg-brand-800",
    secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
    outline: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

// ---------------------------------------------------------------- Badge
export function Badge({
  className,
  color = "slate",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  color?: "slate" | "green" | "amber" | "red" | "brand";
}) {
  const colors = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    brand: "bg-brand-100 text-brand-800",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        colors[color],
        className,
      )}
      {...props}
    />
  );
}

// ---------------------------------------------------------------- Input / Textarea
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500",
        className,
      )}
      {...props}
    />
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500",
        className,
      )}
      {...props}
    />
  );
});

// ---------------------------------------------------------------- Slider (labelled, a11y)
export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <span className="text-sm font-mono text-brand-700">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-700"
      />
      {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- Toggle
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition",
        checked ? "bg-brand-700" : "bg-slate-300",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white transition",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

// ---------------------------------------------------------------- Tabs
export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div role="tablist" className="flex gap-1 rounded-xl bg-slate-100 p-1">
      {tabs.map((tb) => (
        <button
          key={tb.id}
          role="tab"
          aria-selected={active === tb.id}
          onClick={() => onChange(tb.id)}
          className={cn(
            "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition",
            active === tb.id
              ? "bg-white text-brand-700 shadow-sm"
              : "text-slate-500 hover:text-slate-700",
          )}
        >
          {tb.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Skeleton / states
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-200", className)} />;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <p className="text-sm text-slate-500">Data temporarily unavailable</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 text-xs text-brand-600 underline">
          Retry
        </button>
      )}
    </div>
  );
}
