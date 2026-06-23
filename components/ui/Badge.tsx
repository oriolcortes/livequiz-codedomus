import type { ReactNode } from "react";

export function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100">{children}</span>;
}
