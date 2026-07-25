import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Music2,
    Volume2,
    VolumeX,
    Waves,
    Zap,
    Circle,
    Square,
    Bluetooth,
    X
} from 'lucide-react';
import { useChimes } from '@/hooks/useChimes';
import { ChimeVoice } from '@/lib/audio/chimesAudioEngine';
import ChimeRipple from '@/components/audio-prototype/ChimeRipple';
import ChimeKeyGuide from '@/components/audio-prototype/ChimeKeyGuide';

const VOICE_OPTIONS: { id: ChimeVoice; label: string; icon: React.ReactNode }[] = [
    { id: 'crystal', label: 'Crystal Chime', icon: <Zap className="w-3.5 h-3.5" /> },
    { id: 'bowl', label: 'Tibetan Bowl', icon: <Circle className="w-3.5 h-3.5" /> },
    { id: 'drum', label: 'Hang Drum', icon: <Square className="w-3.5 h-3.5" /> },
];

interface ScorePadProps {
    onClose?: () => void;
}

const ScorePad: React.FC<ScorePadProps> = ({ onClose }) => {
    const {
        activeNotes,
        currentVoice,
        setVoice,
        reverbOn,
        toggleReverb,
        droneOn,
        toggleDrone,
        volume,
        setVolume,
        midiDeviceName,
        pressedKeys,
        playNote,
    } = useChimes();

    const [showKeyGuide, setShowKeyGuide] = useState(true);
    const [showIdleHint, setShowIdleHint] = useState(true);
    const [showVoiceMenu, setShowVoiceMenu] = useState(false);

    // Hide idle hint after first note
    useEffect(() => {
        if (activeNotes.length > 0) {
            setShowIdleHint(false);
        }
    }, [activeNotes]);

    const handleBackgroundClick = (e: React.MouseEvent | React.TouchEvent) => {
        // Only trigger if clicking the background, not UI elements
        if (e.target !== e.currentTarget) return;

        // Pick a note based on horizontal position
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const percent = clientX / window.innerWidth;
        const index = Math.floor(percent * 15); // 15 notes total
        playNote(index);
    };

    return (
        <div 
            className="relative w-full h-full min-h-[500px] rounded-xl text-white select-none overflow-hidden bg-[#0a0a0f] font-sans touch-none border border-white/10"
            onMouseDown={handleBackgroundClick}
            onTouchStart={handleBackgroundClick}
        >
            {/* Ambient background gradient */}
            <div
                className="absolute inset-0 opacity-30 pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse at 30% 20%, rgba(45,212,191,0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(167,139,250,0.06) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(251,191,36,0.04) 0%, transparent 60%)',
                }}
            />

            {/* Subtle stars / particles background */}
            <div className="absolute inset-0 opacity-40 pointer-events-none">
                {Array.from({ length: 40 }).map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-px h-px bg-white rounded-full"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                            opacity: [0.1, 0.6, 0.1],
                        }}
                        transition={{
                            duration: 3 + Math.random() * 4,
                            repeat: Infinity,
                            delay: Math.random() * 3,
                        }}
                    />
                ))}
            </div>

            {/* Ripple Visualizer */}
            <ChimeRipple activeNotes={activeNotes} />

            {/* ─── Top Navigation ──────────────────────────── */}
            <nav className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-start z-30 pointer-events-none">
                {/* Left: Title */}
                <div className="flex items-center gap-3">
                    <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5 pointer-events-auto flex items-center gap-2">
                        <Music2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-teal-400" />
                        <div>
                            <h1 className="text-sm md:text-base font-light tracking-[0.15em] uppercase">
                                ScorePad
                            </h1>
                            <p className="text-[8px] md:text-[9px] uppercase tracking-[0.3em] text-white/40 mt-0.5">
                                Audio Mood Prototyper
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: Controls */}
                <div className="flex items-center gap-2 pointer-events-auto">
                    {/* MIDI indicator */}
                    {midiDeviceName && (
                        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-[10px] text-teal-400 uppercase tracking-wider">
                            <Bluetooth className="w-3 h-3" />
                            {midiDeviceName}
                        </div>
                    )}

                    {/* Voice Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowVoiceMenu(!showVoiceMenu)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-sm"
                            title="Change instrument voice"
                        >
                            {VOICE_OPTIONS.find(v => v.id === currentVoice)?.icon}
                            <span className="hidden md:inline text-xs text-white/70">
                                {VOICE_OPTIONS.find(v => v.id === currentVoice)?.label}
                            </span>
                        </button>

                        <AnimatePresence>
                            {showVoiceMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                    className="absolute right-0 top-12 bg-black/80 backdrop-blur-2xl rounded-xl border border-white/10 overflow-hidden shadow-2xl min-w-[180px] z-50"
                                >
                                    {VOICE_OPTIONS.map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => { setVoice(opt.id); setShowVoiceMenu(false); }}
                                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all ${currentVoice === opt.id
                                                ? 'bg-white/10 text-teal-400'
                                                : 'hover:bg-white/5 text-white/60'
                                                }`}
                                        >
                                            {opt.icon}
                                            {opt.label}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Reverb Toggle */}
                    <button
                        onClick={toggleReverb}
                        className={`p-2.5 rounded-xl border transition-all ${reverbOn
                            ? 'bg-teal-500/15 border-teal-500/30 text-teal-400'
                            : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                            }`}
                        title={reverbOn ? 'Reverb ON' : 'Reverb OFF'}
                    >
                        <Waves className="w-4 h-4" />
                    </button>

                    {/* Drone Toggle */}
                    <button
                        onClick={toggleDrone}
                        className={`p-2.5 rounded-xl border transition-all ${droneOn
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                            : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                            }`}
                        title={droneOn ? 'Drone ON' : 'Drone OFF'}
                    >
                        <span className="text-xs font-bold">OM</span>
                    </button>

                    {/* Volume */}
                    <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
                        {volume > 0 ? (
                            <Volume2 className="w-4 h-4 text-white/40" />
                        ) : (
                            <VolumeX className="w-4 h-4 text-white/40" />
                        )}
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={volume}
                            onChange={e => setVolume(parseFloat(e.target.value))}
                            className="w-20 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-teal-500"
                            title="Volume"
                        />
                    </div>

                    {/* Close Button (if provided) */}
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2.5 ml-2 bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-all border border-white/5"
                            title="Close ScorePad"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </nav>

            {/* ─── Idle Hint ───────────────────────────────── */}
            <AnimatePresence>
                {showIdleHint && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.5 } }}
                        transition={{ delay: 1, duration: 1 }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                    >
                        <div className="text-center">
                            <motion.p
                                animate={{ opacity: [0.3, 0.7, 0.3] }}
                                transition={{ duration: 4, repeat: Infinity }}
                                className="text-xl md:text-3xl font-extralight tracking-[0.2em] text-white/30 uppercase"
                            >
                                Tap to score the scene
                            </motion.p>
                            <p className="text-[10px] uppercase tracking-[0.4em] text-white/15 mt-4">
                                Press any key · A through Y
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Key Guide ───────────────────────────────── */}
            <ChimeKeyGuide
                pressedKeys={pressedKeys}
                isVisible={showKeyGuide}
                onToggle={() => setShowKeyGuide(!showKeyGuide)}
                onPlayNote={playNote}
            />

            {/* ─── Custom Styles ───────────────────────────── */}
            <style>{`
                input[type='range']::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 12px;
                    height: 12px;
                    background: #2dd4bf;
                    border-radius: 50%;
                    cursor: pointer;
                    border: 2px solid white;
                    box-shadow: 0 0 8px rgba(45, 212, 191, 0.4);
                }
                input[type='range']::-moz-range-thumb {
                    width: 12px;
                    height: 12px;
                    background: #2dd4bf;
                    border-radius: 50%;
                    cursor: pointer;
                    border: 2px solid white;
                    box-shadow: 0 0 8px rgba(45, 212, 191, 0.4);
                }
            `}</style>
        </div>
    );
};

export default ScorePad;
