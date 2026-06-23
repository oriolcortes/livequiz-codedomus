import type { HTMLAttributes, ReactNode } from "react";

export function Card({ children, className = "", ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <section className={`glass-card rounded-3xl p-6 ${className}`} {...props}>
      {children}
    </section>
  );
}
