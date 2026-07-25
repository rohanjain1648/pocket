"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Users,
  Volume2,
  Mic,
  MicOff,
  Radio,
  TrendingUp,
  Brain,
  MessageSquare,
  Globe,
  Activity,
  User,
  LogOut,
  Sliders,
  Play,
  Layers,
  Zap,
  Bookmark,
  ShieldCheck,
  Server,
  BookOpen,
  VolumeX,
} from "lucide-react";
import { GradientText } from "@/components/ui/GradientText";
import { GlassCard } from "@/components/ui/GlassCard";
import { Reveal, RevealItem } from "@/components/ui/Reveal";

// Mock Data for the 14 Story Intelligence Modules
interface IntelligenceModule {
  name: string;
  desc: string;
  status: string;
  metric: string;
  icon: React.ReactNode;
  color: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "voiceroom">("voiceroom");

  // Voice Room States
  const [isJoined, setIsJoined] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<"AI Agent" | "User" | "Idle">("AI Agent");
  const [transcripts, setTranscripts] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: "Platform Host", text: "Welcome to the PocketFM Voice Room. I'm parsing the latest content retrieved from the web.", time: "23:20" },
    { sender: "Narrative Agent", text: "I've structured a 3-part dialogue script focusing on our emotion intelligence pipeline.", time: "23:21" }
  ]);
  const [inputText, setInputText] = useState("");
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Simulated AI dialog feed
  const mockDialogues = [
    { sender: "Emotion Agent", text: "Integrating Expressive TTS models will allow characters to transition dynamically based on dialogue sentiment." },
    { sender: "Dialogue Agent", text: "Exactly! Traditional platforms overlook user mood, but we adapt character voices in real-time." },
    { sender: "Character Intelligence", text: "Adding World Intelligence helps the AI keep consistency across long episodic formats." },
    { sender: "Platform Host", text: "Mugunth has joined the room. Real-time script synthesis is ready for generation." }
  ];

  // Auto-scroll transcripts
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts]);

  // Simulate AI Speaking and dialogue feed
  useEffect(() => {
    if (!isJoined) return;

    const interval = setInterval(() => {
      const randomLine = mockDialogues[Math.floor(Math.random() * mockDialogues.length)];
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      setActiveSpeaker("AI Agent");
      setTranscripts(prev => [...prev, { ...randomLine, time: timeStr }]);

      setTimeout(() => {
        setActiveSpeaker("Idle");
      }, 3000);

    }, 8500);

    return () => clearInterval(interval);
  }, [isJoined]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    setTranscripts(prev => [...prev, { sender: "User (Mugunth)", text: inputText, time: timeStr }]);
    setInputText("");
    setActiveSpeaker("User");

    // Simulate Host response
    setTimeout(() => {
      setActiveSpeaker("AI Agent");
      setTranscripts(prev => [
        ...prev,
        {
          sender: "Platform Host",
          text: "Acknowledged, Mugunth. Updating the multi-agent reasoning flow with your suggestions.",
          time: timeStr
        }
      ]);
      setTimeout(() => setActiveSpeaker("Idle"), 2500);
    }, 1500);
  };

  const modules: IntelligenceModule[] = [
    { name: "Character Intelligence", desc: "Tracks character arcs, motives & traits.", status: "Optimized", metric: "142 profiles cached", icon: <User className="w-5 h-5" />, color: "#8b5cf6" },
    { name: "Emotion Intelligence", desc: "Analyzes sentiment shifts in scripts.", status: "Active", metric: "Sentiment flow: 98% accuracy", icon: <Brain className="w-5 h-5" />, color: "#ec4899" },
    { name: "Dialogue Intelligence", desc: "Ensures natural script readability.", status: "Active", metric: "Conversational Index: 9.4", icon: <MessageSquare className="w-5 h-5" />, color: "#6366f1" },
    { name: "World Intelligence", desc: "Maintains lore and setting consistency.", status: "Synced", metric: "24 lore nodes defined", icon: <Globe className="w-5 h-5" />, color: "#3b82f6" },
    { name: "Narrative Intelligence", desc: "Structures plot lines & episode pacing.", status: "Active", metric: "Pacing coefficient: 1.12", icon: <Activity className="w-5 h-5" />, color: "#10b981" },
    { name: "Theme Intelligence", desc: "Extracts underlying themes & genres.", status: "Ready", metric: "12 custom subgenres", icon: <Sliders className="w-5 h-5" />, color: "#f59e0b" },
    { name: "Conflict Intelligence", desc: "Measures story tension & climaxes.", status: "Monitoring", metric: "Tension Peak: 8.5/10", icon: <Zap className="w-5 h-5" />, color: "#ef4444" },
    { name: "Timeline Intelligence", desc: "Ensures chronological event coherence.", status: "Clean", metric: "0 timeline overlaps", icon: <Layers className="w-5 h-5" />, color: "#14b8a6" },
    { name: "Relationship Intelligence", desc: "Tracks dynamic character bounds.", status: "Active", metric: "35 bonds mapped", icon: <Users className="w-5 h-5" />, color: "#a855f7" },
    { name: "Cliffhanger Intelligence", desc: "Validates hook rates at episode ends.", status: "Optimized", metric: "Retention: +24%", icon: <Bookmark className="w-5 h-5" />, color: "#f97316" },
    { name: "Pacing Intelligence", desc: "Monitors words-per-minute audio rates.", status: "Active", metric: "Avg 145 WPM output", icon: <TrendingUp className="w-5 h-5" />, color: "#22c55e" },
    { name: "Readability Intelligence", desc: "Assesses script grammar & vocabulary.", status: "Active", metric: "Flesch-Kincaid: Grade 7", icon: <BookOpen className="w-5 h-5" />, color: "#06b6d4" },
    { name: "Language Intelligence", desc: "Handles real-time translations.", status: "Ready", metric: "8 languages supported", icon: <ShieldCheck className="w-5 h-5" />, color: "#f43f5e" },
    { name: "Audience Intelligence", desc: "Predicts listener engagement rates.", status: "Active", metric: "92% match score", icon: <Server className="w-5 h-5" />, color: "#0ea5e9" }
  ];

  return (
    <div className="flex-1 w-full min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)] flex flex-col relative overflow-hidden">
      {/* Ambient Glow Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[var(--color-violet)]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[var(--color-accent)]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-[var(--color-glass-border)] bg-[var(--color-glass)] backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[var(--color-accent)] to-[var(--color-violet)] flex items-center justify-center shadow-lg shadow-[var(--color-violet-glow)]">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
                <GradientText animate={false}>POCKET_FM</GradientText>
                <span className="text-xs bg-[var(--color-violet-soft)] border border-[var(--color-violet)]/30 text-[var(--color-violet)] font-mono px-2 py-0.5 rounded-full">Voice Intelligence</span>
              </h1>
              <p className="text-xs text-[var(--color-ink-muted)]">AI Content Intelligence Platform • Hackathon Prototype</p>
            </div>
          </div>

          <div className="flex items-center gap-1 glass-card !rounded-xl p-1">
            <button
              onClick={() => setActiveTab("voiceroom")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeTab === "voiceroom"
                  ? "bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-violet)] text-black shadow-md"
                  : "text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              }`}
            >
              Live Voice Room
            </button>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeTab === "dashboard"
                  ? "bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-violet)] text-black shadow-md"
                  : "text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              }`}
            >
              System Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 pt-32 pb-8 flex flex-col">
        {activeTab === "voiceroom" ? (
          /* Voice Room View */
          <div className="flex flex-col items-center justify-center max-w-xl mx-auto w-full py-6">
            <div className="w-full text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-violet-soft)] border border-[var(--color-violet)]/30 text-xs text-[var(--color-violet)] font-mono mb-3">
                <span className="w-2 h-2 rounded-full bg-[var(--color-violet)] animate-pulse" />
                VOICE ROOM ACTIVE
              </div>
              <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
                <GradientText>Voice Room Feature</GradientText>
              </h2>
              <p className="text-[var(--color-ink-dim)] text-sm mt-1">Multi-Agent Script synthesis and Live Conversational AI</p>
            </div>

            {/* Central Glowing Orb Card */}
            <GlassCard className="w-full mb-6 flex flex-col items-center" padding="p-8" glowColor="violet">
              <div className="absolute top-0 right-0 p-4">
                <div className="flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)]">
                  <Users className="w-3.5 h-3.5" />
                  <span>2 Active Speakers</span>
                </div>
              </div>

              {/* Pulsing Voice Orb */}
              <div className="h-64 flex items-center justify-center relative w-full my-4">
                {isJoined ? (
                  <>
                    {/* Animated Ripple Waves */}
                    <div className={`absolute w-44 h-44 rounded-full border border-[var(--color-violet)]/30 transition-all duration-1000 ${
                      activeSpeaker !== "Idle" ? "animate-ping opacity-25" : "opacity-0"
                    }`} />
                    <div className={`absolute w-36 h-36 rounded-full border border-[var(--color-accent)]/40 transition-all duration-700 ${
                      activeSpeaker !== "Idle" ? "animate-ping opacity-30" : "opacity-0"
                    }`} />

                    {/* Central Interactive Orb */}
                    <div className={`w-28 h-28 rounded-full bg-gradient-to-tr from-[var(--color-accent)] via-[var(--color-violet)] to-[var(--color-cyan)] flex flex-col items-center justify-center shadow-[0_0_50px_var(--color-violet-glow)] transition-all duration-300 ${
                      activeSpeaker !== "Idle" ? "animate-glow-pulse" : "opacity-90"
                    }`}>
                      <Volume2 className="w-8 h-8 text-black animate-bounce" />
                    </div>

                    {/* Speaker Tags */}
                    <div className="absolute bottom-2 flex flex-col items-center">
                      <span className="text-xs text-[var(--color-ink-muted)] font-mono tracking-widest uppercase">CURRENTLY SPEAKING</span>
                      <span className="text-sm font-semibold text-[var(--color-violet)] mt-0.5">
                        {activeSpeaker === "AI Agent" ? "🎙️ AI Narrative Host" : activeSpeaker === "User" ? "🎙️ Mugunth (You)" : "💤 Waiting for response"}
                      </span>
                    </div>
                  </>
                ) : (
                  <motion.button
                    onClick={() => {
                      setIsJoined(true);
                      setTranscripts(prev => [...prev, { sender: "Platform", text: "Joined the voice room.", time: "" }]);
                    }}
                    className="w-24 h-24 rounded-full glass-card border-[var(--color-violet)]/30 flex items-center justify-center group"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Play className="w-8 h-8 text-[var(--color-ink-dim)] group-hover:text-[var(--color-violet)] transition-all ml-1" />
                  </motion.button>
                )}
              </div>

              {/* Minimal Audio Bars Visualizer */}
              {isJoined && activeSpeaker !== "Idle" && (
                <div className="flex items-center gap-1.5 h-6 mb-2">
                  <span className="w-1 h-3 bg-[var(--color-accent)] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <span className="w-1 h-5 bg-[var(--color-violet)] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                  <span className="w-1 h-6 bg-[var(--color-cyan)] rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
                  <span className="w-1 h-4 bg-[var(--color-accent)] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <span className="w-1 h-2 bg-[var(--color-violet)] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              )}
            </GlassCard>

            {/* Real-time Transcription Board */}
            {isJoined && (
              <GlassCard className="w-full mb-6 flex flex-col h-80" padding="p-5" glowColor="none">
                <span className="text-xs text-[var(--color-ink-muted)] font-mono mb-2 uppercase tracking-wider">Live Transcript Stream</span>
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-sm">
                  {transcripts.map((t, i) => (
                    <motion.div
                      key={i}
                      className="flex flex-col"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-xs ${t.sender.startsWith("User") ? "text-[var(--color-accent)]" : "text-[var(--color-violet)]"}`}>
                          {t.sender}
                        </span>
                        {t.time && <span className="text-[10px] text-[var(--color-ink-muted)]">{t.time}</span>}
                      </div>
                      <p className="text-[var(--color-ink-dim)] text-sm mt-1">{t.text}</p>
                    </motion.div>
                  ))}
                  <div ref={transcriptEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder="Speak to AI agents or type message..."
                    className="flex-1 bg-[var(--color-panel)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] outline-none transition-all duration-300 focus:border-[var(--color-violet)] focus:shadow-[0_0_0_3px_var(--color-violet-soft)]"
                  />
                  <motion.button
                    type="submit"
                    className="bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-violet)] text-black rounded-xl px-4 py-2 text-xs font-semibold"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Send
                  </motion.button>
                </form>
              </GlassCard>
            )}

            {/* Room Controls Panel */}
            <GlassCard className="w-full flex items-center justify-between" padding="px-6 py-4" glowColor="none">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-3 rounded-xl border transition-all duration-300 ${
                    isMuted
                      ? "bg-[var(--color-risk-critical)]/10 border-[var(--color-risk-critical)]/30 text-[var(--color-risk-critical)]"
                      : "border-[var(--color-border)] text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] hover:border-[var(--color-violet)]/30"
                  }`}
                  title={isMuted ? "Unmute Mic" : "Mute Mic"}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <button
                  onClick={() => setIsDeafened(!isDeafened)}
                  className={`p-3 rounded-xl border transition-all duration-300 ${
                    isDeafened
                      ? "bg-[var(--color-risk-critical)]/10 border-[var(--color-risk-critical)]/30 text-[var(--color-risk-critical)]"
                      : "border-[var(--color-border)] text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] hover:border-[var(--color-violet)]/30"
                  }`}
                  title={isDeafened ? "Turn Audio On" : "Deafen Audio"}
                >
                  {isDeafened ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>

              {isJoined ? (
                <motion.button
                  onClick={() => {
                    setIsJoined(false);
                    setActiveSpeaker("Idle");
                    setTranscripts(prev => [...prev, { sender: "Platform", text: "Left the voice room.", time: "" }]);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[var(--color-risk-critical)] text-white text-xs font-semibold flex items-center gap-2 shadow-lg"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <LogOut className="w-4 h-4" />
                  Leave Room
                </motion.button>
              ) : (
                <motion.button
                  onClick={() => {
                    setIsJoined(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-violet)] text-black text-xs font-semibold flex items-center gap-2 shadow-lg"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Radio className="w-4 h-4 animate-pulse" />
                  Join Room
                </motion.button>
              )}
            </GlassCard>
          </div>
        ) : (
          /* Hackathon Dashboard View */
          <div className="space-y-8">
            {/* Overview Stats */}
            <Reveal stagger staggerDelay={0.08} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: "ACTIVE MODULES", value: "14 Modules", badge: "Fully Synchronized", badgeIcon: <ShieldCheck className="w-3.5 h-3.5" />, badgeColor: "var(--color-risk-low)" },
                { label: "AGENT STATUS", value: "6 Agents Live", badge: "Processing Voice Room #104", badgeIcon: <Activity className="w-3.5 h-3.5 animate-pulse" />, badgeColor: "var(--color-violet)" },
                { label: "SYNTHESIS WPM", value: "145 WPM", badge: "Optimized for Emotion Shift", badgeIcon: <TrendingUp className="w-3.5 h-3.5" />, badgeColor: "var(--color-violet)" },
                { label: "RETRIEVED CONTENT", value: "4.8k Docs / Hr", badge: "Live Web Summarization", badgeIcon: <Globe className="w-3.5 h-3.5" />, badgeColor: "var(--color-cyan)" },
              ].map((stat, i) => (
                <RevealItem key={i}>
                  <GlassCard padding="p-5" glowColor="none" hoverTilt={false}>
                    <span className="text-[var(--color-ink-muted)] text-xs font-mono">{stat.label}</span>
                    <p className="text-2xl font-semibold mt-1" style={{ fontFamily: "var(--font-heading)" }}>{stat.value}</p>
                    <div className="flex items-center gap-1.5 text-xs mt-2" style={{ color: stat.badgeColor }}>
                      {stat.badgeIcon}
                      <span>{stat.badge}</span>
                    </div>
                  </GlassCard>
                </RevealItem>
              ))}
            </Reveal>

            {/* Proposal */}
            <Reveal>
              <GlassCard padding="p-6" glowColor="violet" className="relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Sparkles className="w-32 h-32" />
                </div>
                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
                  <Sparkles className="w-5 h-5 text-[var(--color-violet)]" />
                  <GradientText animate={false}>PocketFM Hackathon: AI Content Intelligence Platform</GradientText>
                </h3>
                <p className="text-[var(--color-ink-dim)] text-xs mt-3 leading-relaxed">
                  Traditional audio streaming platforms primarily rely on collaborative filtering and viewing history to recommend content,
                  often overlooking deeper narrative, character structures, emotional flow, and real-time interest shifts.
                  Our platform combines advanced story understanding and live script generation via a multi-agent system. It analyzes stories
                  through 14 custom intelligence pipelines, simultaneously building an evolving user memory graph, creating a personalized audio assistant.
                </p>
              </GlassCard>
            </Reveal>

            {/* 14 Intelligence Modules */}
            <Reveal delay={0.1}>
              <h3 className="text-md font-bold tracking-tight mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
                <Brain className="w-5 h-5 text-[var(--color-violet)]" />
                <GradientText animate={false}>14 Story Intelligence Pipelines</GradientText>
              </h3>
            </Reveal>
            <Reveal stagger staggerDelay={0.05} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {modules.map((m, idx) => (
                <RevealItem key={idx}>
                  <GlassCard
                    padding="p-5"
                    className="group h-full"
                    hoverTilt={false}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className="p-2 rounded-xl transition-colors duration-300"
                        style={{
                          background: `${m.color}15`,
                          color: m.color,
                        }}
                      >
                        {m.icon}
                      </div>
                      <span className="text-[10px] text-[var(--color-ink-muted)] font-mono uppercase glass-card !rounded-full px-2 py-0.5">
                        {m.status}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold" style={{ fontFamily: "var(--font-heading)" }}>{m.name}</h4>
                    <p className="text-[var(--color-ink-dim)] text-xs mt-1.5">{m.desc}</p>
                    <div className="text-[10px] text-[var(--color-ink-muted)] mt-3 font-mono border-t border-[var(--color-border)] pt-2.5">
                      Metric: {m.metric}
                    </div>
                    {/* Color accent top bar on hover */}
                    <div
                      className="absolute top-0 left-[10%] right-[10%] h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: m.color }}
                    />
                  </GlassCard>
                </RevealItem>
              ))}
            </Reveal>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-xl w-full mx-auto border-t border-[var(--color-glass-border)] py-2 mt-4">
        <div className="text-center text-[10px] text-[var(--color-ink-muted)] font-mono">
          © {new Date().getFullYear()} POCKET_FM HACKATHON • Mugunth Dev
        </div>
      </footer>
    </div>
  );
}
