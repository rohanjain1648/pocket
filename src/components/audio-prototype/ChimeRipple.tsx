import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NoteEvent } from '@/lib/audio/chimesAudioEngine';

interface RippleData {
    id: string;
    x: number;
    y: number;
    color: string;
    glow: string;
    size: number;
}

const OCTAVE_COLORS: Record<number, { color: string; glow: string }> = {
    3: { color: 'rgba(251, 191, 36, 0.35)', glow: 'rgba(251, 191, 36, 0.15)' },  // amber — low
    4: { color: 'rgba(45, 212, 191, 0.35)', glow: 'rgba(45, 212, 191, 0.15)' },   // teal — mid
    5: { color: 'rgba(167, 139, 250, 0.35)', glow: 'rgba(167, 139, 250, 0.15)' }, // violet — high
};

interface ChimeRippleProps {
    activeNotes: NoteEvent[];
}

const ChimeRipple: React.FC<ChimeRippleProps> = ({ activeNotes }) => {
    const [ripples, setRipples] = useState<RippleData[]>([]);
    const lastNoteCount = useRef(0);

    useEffect(() => {
        if (activeNotes.length <= lastNoteCount.current && activeNotes.length !== 0) {
            lastNoteCount.current = activeNotes.length;
            return;
        }
        lastNoteCount.current = activeNotes.length;

        // Get the newest note(s)
        const newNotes = activeNotes.slice(-1);
        const newRipples: RippleData[] = newNotes.map(note => {
            const octaveStyle = OCTAVE_COLORS[note.octave] || OCTAVE_COLORS[4];
            return {
                id: `${note.timestamp}-${note.note}-${Math.random()}`,
                x: 15 + Math.random() * 70, // % from left
                y: 10 + Math.random() * 60, // % from top
                color: octaveStyle.color,
                glow: octaveStyle.glow,
                size: 80 + note.velocity * 200,
            };
        });

        if (newRipples.length === 0) return;

        setRipples(prev => {
            const next = [...prev, ...newRipples];
            return next.length > 15 ? next.slice(-15) : next;
        });

        // Auto-remove after animation
        setTimeout(() => {
            setRipples(prev => prev.filter(r => !newRipples.some(nr => nr.id === r.id)));
        }, 3000);
    }, [activeNotes]);

    return (
        <div className="absolute inset-0 pointer-events-none z-5 overflow-hidden">
            <AnimatePresence>
                {ripples.map(ripple => (
                    <motion.div
                        key={ripple.id}
                        className="absolute rounded-full"
                        style={{
                            left: `${ripple.x}%`,
                            top: `${ripple.y}%`,
                            transform: 'translate(-50%, -50%)',
                        }}
                        initial={{ width: 0, height: 0, opacity: 0.8 }}
                        animate={{
                            width: ripple.size,
                            height: ripple.size,
                            opacity: 0,
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 2.8, ease: 'easeOut' }}
                    >
                        {/* Outer ring */}
                        <div
                            className="absolute inset-0 rounded-full"
                            style={{
                                border: `2px solid ${ripple.color}`,
                                boxShadow: `0 0 30px ${ripple.glow}, inset 0 0 30px ${ripple.glow}`,
                            }}
                        />
                        {/* Inner ring */}
                        <motion.div
                            className="absolute rounded-full"
                            style={{
                                inset: '25%',
                                border: `1px solid ${ripple.color}`,
                            }}
                            initial={{ opacity: 0.6 }}
                            animate={{ opacity: 0 }}
                            transition={{ duration: 2, ease: 'easeOut' }}
                        />
                        {/* Core dot */}
                        <motion.div
                            className="absolute rounded-full"
                            style={{
                                inset: '45%',
                                background: ripple.color,
                                boxShadow: `0 0 20px ${ripple.glow}`,
                            }}
                            initial={{ opacity: 1, scale: 1 }}
                            animate={{ opacity: 0, scale: 0.5 }}
                            transition={{ duration: 1.5, ease: 'easeOut' }}
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default ChimeRipple;
