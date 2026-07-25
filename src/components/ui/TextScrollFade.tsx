"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

interface TextScrollFadeProps {
  children: string;
  className?: string;
  mode?: "word" | "character";
  tag?: "h1" | "h2" | "h3" | "p" | "span";
}

export function TextScrollFade({
  children,
  className = "",
  mode = "word",
  tag = "h1",
}: TextScrollFadeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.9", "start 0.3"],
  });

  const units = mode === "character" ? children.split("") : children.split(" ");

  const MotionTag = motion[tag] as typeof motion.h1;

  return (
    <div ref={containerRef}>
      <MotionTag className={className} style={{ display: "flex", flexWrap: "wrap", gap: mode === "word" ? "0.3em" : "0" }}>
        {units.map((unit, i) => {
          const start = i / units.length;
          const end = (i + 1) / units.length;

          return (
            <TextUnit
              key={`${unit}-${i}`}
              unit={unit}
              rangeStart={start}
              rangeEnd={end}
              scrollYProgress={scrollYProgress}
              isChar={mode === "character"}
            />
          );
        })}
      </MotionTag>
    </div>
  );
}

function TextUnit({
  unit,
  rangeStart,
  rangeEnd,
  scrollYProgress,
  isChar,
}: {
  unit: string;
  rangeStart: number;
  rangeEnd: number;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
  isChar: boolean;
}) {
  const opacity = useTransform(scrollYProgress, [rangeStart, rangeEnd], [0.15, 1]);
  const y = useTransform(scrollYProgress, [rangeStart, rangeEnd], [8, 0]);

  return (
    <motion.span
      style={{ opacity, y, display: "inline-block" }}
    >
      {unit === " " && !isChar ? "\u00A0" : unit}
    </motion.span>
  );
}
