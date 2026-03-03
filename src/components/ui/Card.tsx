import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export default function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`relative bg-card border border-border rounded-2xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
