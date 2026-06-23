import type { InputHTMLAttributes } from "react";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`focus-ring w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 shadow-sm placeholder:text-slate-400 ${className}`}
      {...props}
    />
  );
}
