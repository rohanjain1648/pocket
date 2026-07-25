"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ThreeScene } from "@/components/ThreeScene";
import { Reveal, RevealItem } from "@/components/ui/Reveal";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientText } from "@/components/ui/GradientText";
import { TextScrollFade } from "@/components/ui/TextScrollFade";
import { ParallaxSection } from "@/components/ui/ParallaxSection";
import {
  ArrowRight, Settings, Radio, Headphones, BrainCircuit,
  Search, Lightbulb, BarChart3, Target, Sparkles, Mic2,
  Users, Flame, Globe2, BookOpen, Clock, Heart, BookText,
  Eye, MessagesSquare, ChevronDown, Swords,
} from "lucide-react";

/* ── Activity icon (not in lucide-react) ────────────────────────── */
function Activity(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

/* ── Data ────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Globe2,
    color: "amber" as const,
    title: "Live Content Engine",
    desc: "Retrieves trusted articles and documents from the web, summarizes them, and transforms them into engaging conversational scripts in real-time.",
  },
  {
    icon: Headphones,
    color: "violet" as const,
    title: "Personalized Audio",
    desc: "Generates tailored audio using highly expressive text-to-speech models, moving beyond collaborative filtering to true emotional resonance.",
  },
  {
    icon: Users,
    color: "cyan" as const,
    title: "Dynamic User Profile",
    desc: "Continuously learns from listening behavior, evolving preferences, mood, and context to deliver context-aware conversations and hyper-personalized recommendations.",
  },
];

const WORKFLOW_STEPS = [
  { icon: Search, label: "Retrieval" },
  { icon: BrainCircuit, label: "Reasoning" },
  { icon: BarChart3, label: "Story Analysis" },
  { icon: Target, label: "Recommendation" },
  { icon: Sparkles, label: "Generation" },
  { icon: Mic2, label: "Synthesis" },
];

const AGENTS = [
  { name: "Character", icon: Users, color: "#8b5cf6" },
  { name: "Emotion", icon: Heart, color: "#ec4899" },
  { name: "Dialogue", icon: MessagesSquare, color: "#6366f1" },
  { name: "World", icon: Globe2, color: "#3b82f6" },
  { name: "Narrative", icon: BookOpen, color: "#10b981" },
  { name: "Theme", icon: Lightbulb, color: "#f59e0b" },
  { name: "Conflict", icon: Flame, color: "#ef4444" },
  { name: "Timeline", icon: Clock, color: "#14b8a6" },
  { name: "Relationship", icon: Target, color: "#a855f7" },
  { name: "Cliffhanger", icon: ArrowRight, color: "#f97316" },
  { name: "Pacing", icon: Activity, color: "#22c55e" },
  { name: "Readability", icon: Eye, color: "#06b6d4" },
  { name: "Language", icon: BookText, color: "#f43f5e" },
  { name: "Audience", icon: Radio, color: "#0ea5e9" },
];

/* ── Page ────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <main className="relative min-h-screen w-full bg-[var(--color-bg)] text-[var(--color-ink)] selection:bg-[var(--color-violet-soft)] selection:text-white overflow-x-hidden">
      {/* Fixed 3D Background */}
      <ThreeScene />

      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section className="relative z-10 flex min-h-screen flex-col items-center justify-between px-6 py-8 md:px-12 md:py-10 pointer-events-none">
        {/* Navigation */}
        <motion.header
          className="flex w-full max-w-7xl items-center justify-between pointer-events-auto"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          <Link href="/" className="text-xl tracking-[0.25em] font-light" style={{ fontFamily: "var(--font-heading)" }}>
            <GradientText animate={false}>SHOWRUNNER</GradientText>
          </Link>

          <nav className="hidden glass-card !rounded-full px-8 py-2.5 md:flex gap-8 text-xs tracking-widest text-[var(--color-ink-dim)]">
            <Link href="#features" className="hover:text-[var(--color-accent)] transition-colors duration-300">FEATURES</Link>
            <Link href="#workflow" className="hover:text-[var(--color-accent)] transition-colors duration-300">WORKFLOW</Link>
            <Link href="#agents" className="hover:text-[var(--color-accent)] transition-colors duration-300">AGENTS</Link>
            <Link href="/dashboard" className="hover:text-[var(--color-accent)] transition-colors duration-300">DASHBOARD</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/voice-room"
              className="hidden sm:flex items-center gap-2 rounded-full border border-[var(--color-violet)]/30 bg-[var(--color-violet)]/10 px-4 py-2 text-xs tracking-wide text-[var(--color-violet)] hover:bg-[var(--color-violet)]/20 transition-all duration-300"
            >
              <Radio size={14} />
              Voice Room
            </Link>
            <Link
              href="/pulse-and-page"
              className="hidden sm:flex items-center gap-2 rounded-full border border-[var(--color-cyan)]/30 bg-[var(--color-cyan)]/10 px-4 py-2 text-xs tracking-wide text-[var(--color-cyan)] hover:bg-[var(--color-cyan)]/20 transition-all duration-300"
            >
              <Heart size={14} />
              Pulse & Page
            </Link>
            <Link
              href="/audioverse"
              className="hidden sm:flex items-center gap-2 rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-4 py-2 text-xs tracking-wide text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 transition-all duration-300"
            >
              <Swords size={14} />
              Audioverse RPG
            </Link>
            <button className="flex h-9 w-9 items-center justify-center rounded-full glass-card !p-0 text-[var(--color-ink-dim)] hover:text-[var(--color-accent)] transition-colors">
              <Settings size={16} />
            </button>
          </div>
        </motion.header>

        {/* Hero Content */}
        <motion.div
          className="flex flex-col items-center text-center pointer-events-auto mt-[-6vh]"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
        >
          {/* Tag */}
          <motion.div
            className="mb-6 flex items-center gap-2 rounded-full border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 px-5 py-1.5 text-xs tracking-widest text-[var(--color-accent)]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Sparkles size={12} />
            PocketFM × Databricks
          </motion.div>

          <h1
            className="mb-5 text-5xl font-light tracking-[0.2em] md:text-7xl lg:text-8xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            <GradientText>SHOWRUNNER</GradientText>
          </h1>

          <motion.h2
            className="mb-6 text-sm font-medium tracking-[0.25em] text-[var(--color-violet)] md:text-base"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.8 }}
          >
            AI CONTENT INTELLIGENCE PLATFORM
          </motion.h2>

          <motion.p
            className="max-w-2xl text-sm leading-relaxed text-[var(--color-ink-dim)] md:text-base md:leading-loose"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
          >
            Advanced story understanding, user personalization, and real-time content generation in a unified AI system.
            Move beyond generic recommendations and build personalized audio experiences tailored to real-time needs.
          </motion.p>

          <motion.div
            className="mt-10 flex items-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.6 }}
          >
            <Link
              href="/dashboard"
              className="group relative flex items-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-violet)] px-8 py-3.5 text-sm font-semibold tracking-wider text-black transition-all hover:shadow-[0_0_30px_var(--color-accent-glow)]"
            >
              <span className="relative z-10">ENTER APP</span>
              <ArrowRight size={16} className="relative z-10 transition-transform group-hover:translate-x-1" />
              {/* Shimmer overlay */}
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </Link>

            <Link
              href="/listen"
              className="flex items-center gap-2 rounded-full border border-[var(--color-glass-border)] bg-[var(--color-glass)] px-6 py-3.5 text-sm tracking-wider text-[var(--color-ink-dim)] backdrop-blur-md transition-all hover:border-[var(--color-violet)]/30 hover:text-[var(--color-ink)]"
            >
              <Headphones size={16} />
              LISTEN
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          className="pointer-events-auto flex flex-col items-center gap-2 text-[var(--color-ink-muted)]"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
        >
          <span className="text-[10px] tracking-[0.3em]">SCROLL</span>
          <ChevronDown size={18} strokeWidth={1.5} />
        </motion.div>
      </section>

      {/* ─── GRADIENT DIVIDER ─────────────────────────────────── */}
      <div className="relative z-10 h-32 bg-gradient-to-b from-transparent via-[var(--color-bg)]/80 to-[var(--color-bg)]" />

      {/* ─── FEATURES ─────────────────────────────────────────── */}
      <section id="features" className="relative z-10 w-full bg-[var(--color-bg)] px-6 py-24 md:px-12">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mb-16 text-center">
            <h3 className="mb-3 text-sm font-medium tracking-[0.2em] text-[var(--color-accent)]">
              CORE CAPABILITIES
            </h3>
            <h2 className="text-3xl font-light tracking-wide md:text-5xl" style={{ fontFamily: "var(--font-heading)" }}>
              <GradientText>Unified AI Intelligence</GradientText>
            </h2>
            <div className="mx-auto mt-6 h-px w-24 bg-gradient-to-r from-transparent via-[var(--color-violet)] to-transparent" />
          </Reveal>

          <Reveal stagger staggerDelay={0.15} className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <RevealItem key={i}>
                <GlassCard
                  glowColor={feature.color}
                  className="group h-full"
                  padding="p-8"
                >
                  <div
                    className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{
                      background: feature.color === "amber"
                        ? "var(--color-accent-soft)"
                        : feature.color === "violet"
                        ? "var(--color-violet-soft)"
                        : "var(--color-cyan-soft)",
                    }}
                  >
                    <feature.icon
                      size={24}
                      strokeWidth={1.5}
                      style={{
                        color: feature.color === "amber"
                          ? "var(--color-accent)"
                          : feature.color === "violet"
                          ? "var(--color-violet)"
                          : "var(--color-cyan)",
                      }}
                    />
                  </div>
                  <h4 className="mb-3 text-lg font-semibold tracking-wide text-[var(--color-ink)]" style={{ fontFamily: "var(--font-heading)" }}>
                    {feature.title}
                  </h4>
                  <p className="text-sm leading-relaxed text-[var(--color-ink-dim)] group-hover:text-[var(--color-ink)] transition-colors duration-300">
                    {feature.desc}
                  </p>
                </GlassCard>
              </RevealItem>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ─── WORKFLOW ─────────────────────────────────────────── */}
      <section id="workflow" className="relative z-10 w-full px-6 py-24 md:px-12 bg-mesh">
        <ParallaxSection speed={0.15}>
          <div className="mx-auto max-w-7xl">
            <Reveal className="mb-20 text-center">
              <h3 className="mb-3 text-sm font-medium tracking-[0.2em] text-[var(--color-violet)]">
                SYSTEM ARCHITECTURE
              </h3>
              <h2 className="text-3xl font-light tracking-wide md:text-5xl" style={{ fontFamily: "var(--font-heading)" }}>
                <GradientText>The AI Workflow</GradientText>
              </h2>
              <div className="mx-auto mt-6 h-px w-24 bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent" />
            </Reveal>

            <div className="relative mx-auto flex max-w-5xl flex-col items-center justify-between md:flex-row">
              {/* Animated Connecting Line */}
              <div className="absolute top-1/2 left-0 hidden h-px w-full -translate-y-1/2 md:block overflow-hidden">
                <motion.div
                  className="h-full w-full"
                  style={{
                    background: "linear-gradient(90deg, var(--color-accent), var(--color-violet), var(--color-cyan))",
                    backgroundSize: "200% 100%",
                  }}
                  animate={{ backgroundPosition: ["0% 0%", "200% 0%"] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
              </div>

              {WORKFLOW_STEPS.map((step, i) => (
                <Reveal key={i} delay={i * 0.1} className="relative z-10 flex flex-col items-center mb-8 md:mb-0 group">
                  <motion.div
                    className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--color-glass-border)] bg-[var(--color-bg)] text-[var(--color-ink)] transition-all duration-300 group-hover:text-[var(--color-accent)] group-hover:border-[var(--color-accent)]/40"
                    whileHover={{
                      y: -4,
                      boxShadow: "0 8px 30px var(--color-accent-glow)",
                    }}
                  >
                    <step.icon size={26} strokeWidth={1.5} />
                  </motion.div>
                  <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-dim)] group-hover:text-[var(--color-accent)] transition-colors duration-300">
                    {step.label}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </ParallaxSection>
      </section>

      {/* ─── AGENTS ───────────────────────────────────────────── */}
      <section id="agents" className="relative z-10 w-full px-6 py-24 md:px-12">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mb-16 text-center">
            <h3 className="mb-3 text-sm font-medium tracking-[0.2em] text-[var(--color-accent)]">
              MULTI-AGENT ORCHESTRATION
            </h3>
            <h2 className="text-3xl font-light tracking-wide md:text-5xl" style={{ fontFamily: "var(--font-heading)" }}>
              <GradientText>14 Intelligence Modules</GradientText>
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-sm text-[var(--color-ink-dim)]">
              A comprehensive semantic understanding of every story, supported by vector databases and knowledge graphs.
            </p>
          </Reveal>

          <Reveal stagger staggerDelay={0.06} className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
            {AGENTS.map((agent, i) => (
              <RevealItem key={i}>
                <GlassCard
                  className="group flex flex-col items-center justify-center text-center h-full cursor-default"
                  padding="p-5"
                  hoverTilt={false}
                >
                  <motion.div
                    whileHover={{ scale: 1.15, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <agent.icon
                      className="mb-3 transition-colors duration-300"
                      style={{ color: agent.color }}
                      size={28}
                      strokeWidth={1.75}
                    />
                  </motion.div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink)] group-hover:text-[var(--color-accent)] transition-colors duration-300">
                    {agent.name}
                  </span>
                  {/* Accent top bar */}
                  <div
                    className="absolute top-0 left-[20%] right-[20%] h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: agent.color }}
                  />
                </GlassCard>
              </RevealItem>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ─── TEXT SCROLL FADE SECTION ─────────────────────────── */}
      <section className="relative z-10 w-full px-6 py-32 md:px-12">
        <div className="mx-auto max-w-4xl text-center">
          <TextScrollFade
            className="text-3xl font-light tracking-wide md:text-5xl lg:text-6xl leading-tight"
            mode="word"
            tag="h2"
          >
            Stories deserve intelligence. Listeners deserve magic.
          </TextScrollFade>
          <Reveal delay={0.3}>
            <p className="mt-8 text-lg text-[var(--color-ink-dim)]">
              Showrunner brings both together.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────────── */}
      <footer className="relative z-10 w-full border-t border-[var(--color-glass-border)] px-6 py-12 md:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex flex-col items-center md:items-start">
            <div className="text-lg tracking-[0.2em] font-light mb-2" style={{ fontFamily: "var(--font-heading)" }}>
              <GradientText animate={false}>SHOWRUNNER</GradientText>
            </div>
            <div className="text-xs text-[var(--color-ink-muted)] tracking-wide">
              © {new Date().getFullYear()} AI Content Intelligence Platform. All rights reserved.
            </div>
          </div>

          <div className="flex gap-8 text-xs tracking-widest text-[var(--color-ink-dim)]">
            <Link href="/privacy" className="hover:text-[var(--color-accent)] transition-colors duration-300">PRIVACY</Link>
            <Link href="/terms" className="hover:text-[var(--color-accent)] transition-colors duration-300">TERMS</Link>
            <Link href="/contact" className="hover:text-[var(--color-accent)] transition-colors duration-300">CONTACT</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
