"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { GradientText } from "@/components/ui/GradientText";
import { ArrowLeft, Heart, RefreshCw } from "lucide-react";

const LOCAL_PULSE_URL = "http://localhost:8000";
const PROD_PULSE_URL = "https://pulse-and-page-backend.onrender.com";

export default function PulseAndPagePage() {
  const [pulseUrl, setPulseUrl] = useState<string>(PROD_PULSE_URL);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkBackend();
  }, []);

  async function checkBackend() {
    setChecking(true);
    // 1. Try local dev server first
    try {
      const res = await fetch(`${LOCAL_PULSE_URL}/api/categories`, {
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok) {
        setPulseUrl(LOCAL_PULSE_URL);
        setBackendOnline(true);
        setChecking(false);
        return;
      }
    } catch {}

    // 2. Fall back to Render production backend
    try {
      const res = await fetch(`${PROD_PULSE_URL}/api/categories`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        setPulseUrl(PROD_PULSE_URL);
        setBackendOnline(true);
        setChecking(false);
        return;
      }
    } catch {}

    setBackendOnline(false);
    setChecking(false);
  }

  return (
    <main className="page-shell min-h-screen flex flex-col">
      {/* Header Bar */}
      <header className="sticky top-0 z-50 border-b border-[var(--color-glass-border)] bg-[var(--color-glass)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Link
              href="/listen"
              className="flex h-9 w-9 items-center justify-center rounded-full glass-card !p-0 text-[var(--color-ink-dim)] hover:text-[var(--color-accent)] transition-colors"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="flex items-center gap-2">
              <Heart size={18} className="text-[#3b82f6]" />
              <h1 className="text-lg font-semibold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
                <GradientText animate={false}>Pulse & Page</GradientText>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {backendOnline === true && (
              <span className="flex items-center gap-1.5 rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/30 px-3 py-1 text-[10px] text-[#3b82f6] font-mono uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3b82f6] animate-pulse" />
                Backend Online
              </span>
            )}
            {backendOnline === false && (
              <span className="flex items-center gap-1.5 rounded-full bg-[var(--color-risk-critical)]/10 border border-[var(--color-risk-critical)]/30 px-3 py-1 text-[10px] text-[var(--color-risk-critical)] font-mono uppercase tracking-wider">
                Backend Offline
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      {backendOnline ? (
        <iframe
          src={pulseUrl}
          className="flex-1 w-full border-0"
          style={{ minHeight: "calc(100vh - 57px)" }}
          allow="autoplay; microphone"
          title="Pulse & Page - Biometric Audiobooks"
        />
      ) : (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="glass-card max-w-lg p-8 text-center">
            {/* Ambient glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#3b82f6]/5 rounded-full blur-[100px] pointer-events-none" />

            <Heart size={48} className="mx-auto mb-4 text-[#3b82f6] opacity-50" />
            <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: "var(--font-heading)" }}>
              <GradientText animate={false}>Pulse & Page Backend Required</GradientText>
            </h2>
            <p className="text-sm text-[var(--color-ink-dim)] mb-6">
              Pulse & Page runs as a separate Python server. Start it to enable biometric audiobook features.
            </p>

            <div className="rounded-xl bg-[var(--color-panel)] p-4 text-left mb-6 space-y-2">
              <p className="text-xs text-[var(--color-ink-dim)] font-mono">
                <span className="text-[var(--color-ink-muted)]"># Terminal 1 — start Pulse & Page</span>
              </p>
              <p className="text-xs text-[var(--color-accent)] font-mono">
                cd pulse-and-page-main
              </p>
              <p className="text-xs text-[var(--color-accent)] font-mono">
                pip install -r requirements.txt
              </p>
              <p className="text-xs text-[var(--color-accent)] font-mono">
                cp .env.example .env  <span className="text-[var(--color-ink-muted)]"># then add your keys</span>
              </p>
              <p className="text-xs text-[var(--color-accent)] font-mono">
                uvicorn app:app --reload
              </p>
            </div>

            <motion.button
              onClick={checkBackend}
              disabled={checking}
              className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#3b82f6] to-[var(--color-violet)] px-6 py-3 text-sm font-semibold text-white transition-all disabled:opacity-50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="flex items-center gap-2">
                <RefreshCw size={14} className={checking ? "animate-spin" : ""} />
                {checking ? "Checking…" : "Retry Connection"}
              </span>
            </motion.button>
          </div>
        </div>
      )}
    </main>
  );
}
