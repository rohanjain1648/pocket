"use client";

import { useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hoverTilt?: boolean;
  glowColor?: "amber" | "violet" | "cyan" | "none";
  padding?: string;
  onClick?: () => void;
}

export function GlassCard({
  children,
  className = "",
  hoverTilt = true,
  glowColor = "none",
  padding = "p-6",
  onClick,
}: GlassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glowX, setGlowX] = useState(50);
  const [glowY, setGlowY] = useState(50);

  function handleMouseMove(e: React.MouseEvent<HTMLElement>) {
    if (!hoverTilt || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setRotateX((y - 0.5) * -8);
    setRotateY((x - 0.5) * 8);
    setGlowX(x * 100);
    setGlowY(y * 100);
  }

  function handleMouseLeave() {
    setRotateX(0);
    setRotateY(0);
    setGlowX(50);
    setGlowY(50);
  }

  const glowColors = {
    amber: "rgba(245, 166, 35, 0.08)",
    violet: "rgba(139, 92, 246, 0.08)",
    cyan: "rgba(34, 211, 238, 0.08)",
    none: "rgba(255, 255, 255, 0.02)",
  };

  const borderGlowColors = {
    amber: "rgba(245, 166, 35, 0.2)",
    violet: "rgba(139, 92, 246, 0.2)",
    cyan: "rgba(34, 211, 238, 0.2)",
    none: "rgba(255, 255, 255, 0.08)",
  };

  return (
    <motion.div
      ref={cardRef}
      className={`
        relative overflow-hidden rounded-2xl
        border border-white/[0.06]
        transition-colors duration-300
        ${padding} ${className}
      `}
      style={{
        perspective: "800px",
        background: `
          radial-gradient(circle at ${glowX}% ${glowY}%, ${glowColors[glowColor]}, transparent 60%),
          var(--color-glass)
        `,
        backdropFilter: "blur(var(--blur-glass))",
        WebkitBackdropFilter: "blur(var(--blur-glass))",
        transform: hoverTilt
          ? `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
          : undefined,
        transformStyle: "preserve-3d",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      whileHover={{
        borderColor: borderGlowColors[glowColor],
        transition: { duration: 0.2 },
      }}
    >
      {/* Top highlight edge */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)`,
        }}
      />
      {children}
    </motion.div>
  );
}
