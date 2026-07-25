import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, ChevronDown } from 'lucide-react';

// Key layout mirrors the physical QWERTY rows
const TOP_ROW = [
    { key: 'q', note: 'A4', index: 9 },
    { key: 'w', note: 'C5', index: 10 },
    { key: 'e', note: 'D5', index: 11 },
    { key: 'r', note: 'E5', index: 12 },
    { key: 't', note: 'G5', index: 13 },
    { key: 'y', note: 'A5', index: 14 },
];

const BOTTOM_ROW = [
    { key: 'a', note: 'C3', index: 0 },
    { key: 's', note: 'D3', index: 1 },
    { key: 'd', note: 'E3', index: 2 },
    { key: 'f', note: 'G3', index: 3 },
    { key: 'g', note: 'A3', index: 4 },
    { key: 'h', note: 'C4', index: 5 },
    { key: 'j', note: 'D4', index: 6 },
    { key: 'k', note: 'E4', index: 7 },
    { key: 'l', note: 'G4', index: 8 },
];

function getOctaveAccent(index: number): string {
    if (index < 5) return 'text-amber-400/60';    // Low octave
    if (index < 10) return 'text-teal-400/60';     // Mid octave
    return 'text-violet-400/60';                    // High octave
}

interface ChimeKeyGuideProps {
    pressedKeys: Set<string>;
    isVisible: boolean;
    onToggle: () => void;
    onPlayNote: (index: number) => void;
}

const ChimeKeyGuide: React.FC<ChimeKeyGuideProps> = ({ pressedKeys, isVisible, onToggle, onPlayNote }) => {
    const renderKey = (item: { key: string; note: string; index: number }) => {
        const isPressed = pressedKeys.has(item.key);
        return (
            <motion.div
                key={item.key}
                onClick={() => onPlayNote(item.index)}
                className={`flex flex-col items-center justify-center w-10 h-10 xs:w-11 xs:h-11 md:w-14 md:h-14 rounded-xl border transition-colors cursor-pointer select-none ${isPressed
                    ? 'bg-white/15 border-white/30 shadow-lg'
                    : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'
                    }`}
                animate={isPressed ? { scale: 0.92, y: 2 } : { scale: 1, y: 0 }}
                whileTap={{ scale: 0.9, y: 3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
                <span className="text-xs md:text-sm font-medium text-white/70 uppercase">{item.key}</span>
                <span className={`text-[7px] md:text-[8px] mt-0.5 ${getOctaveAccent(item.index)}`}>{item.note}</span>
            </motion.div>
        );
    };

    return (
        <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center pb-4 pointer-events-none px-4">
            {/* Toggle button */}
            <button
                onClick={onToggle}
                className="mb-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-white/30 hover:text-white/50 transition-all text-xs pointer-events-auto"
            >
                <Keyboard className="w-3.5 h-3.5" />
                <ChevronDown className={`w-3 h-3 transition-transform ${isVisible ? '' : 'rotate-180'}`} />
            </button>
            
            {/* Key guide */}
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.3 }}
                        className="w-full max-w-[480px] bg-black/40 backdrop-blur-xl rounded-2xl border border-white/5 p-3 md:p-5 pointer-events-auto"
                    >
                        {/* Top row (Q-Y) */}
                        <div className="flex flex-wrap gap-1 md:gap-2 justify-center mb-1.5 md:mb-2 text-center">
                            {TOP_ROW.map(renderKey)}
                        </div>
                        {/* Bottom row (A-L) */}
                        <div className="flex flex-wrap gap-1 md:gap-2 justify-center">
                            {BOTTOM_ROW.map(renderKey)}
                        </div>
                        {/* Legend */}
                        <div className="flex justify-center flex-wrap gap-x-4 gap-y-1 mt-3 text-[8px] md:text-[9px] uppercase tracking-wider">
                            <span className="flex items-center gap-1 text-white/40">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Low
                            </span>
                            <span className="flex items-center gap-1 text-white/40">
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" /> Mid
                            </span>
                            <span className="flex items-center gap-1 text-white/40">
                                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" /> High
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChimeKeyGuide;
