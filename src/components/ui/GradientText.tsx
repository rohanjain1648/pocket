"use client";

import type { ReactNode } from "react";

interface GradientTextProps {
  children: ReactNode;
  className?: string;
  animate?: boolean;
  from?: string;
  via?: string;
  to?: string;
}

export function GradientText({
  children,
  className = "",
  animate = true,
  from = "var(--color-accent)",
  via = "var(--color-violet)",
  to = "var(--color-cyan)",
}: GradientTextProps) {
  return (
    <span
      className={`${animate ? "text-gradient" : "text-gradient-static"} ${className}`}
      style={
        animate
          ? { backgroundImage: `linear-gradient(135deg, ${from}, ${via}, ${to})` }
          : { backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }
      }
    >
      {children}
    </span>
  );
}
