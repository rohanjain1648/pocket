// useChimes.ts — React hook for keyboard + MIDI input mapping to chime notes
import { useState, useEffect, useRef, useCallback } from 'react';
import { ChimesAudioEngine, ChimeVoice, NoteEvent } from '@/lib/audio/chimesAudioEngine';

// Keyboard → note index mapping (2 rows)
const KEY_MAP: Record<string, number> = {
    'a': 0, 's': 1, 'd': 2, 'f': 3, 'g': 4,
    'h': 5, 'j': 6, 'k': 7, 'l': 8,
    'q': 9, 'w': 10, 'e': 11, 'r': 12, 't': 13, 'y': 14,
};

const KEY_LABELS = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Q', 'W', 'E', 'R', 'T', 'Y'];

export interface UseChimesReturn {
    activeNotes: NoteEvent[];
    currentVoice: ChimeVoice;
    setVoice: (v: ChimeVoice) => void;
    reverbOn: boolean;
    toggleReverb: () => void;
    droneOn: boolean;
    toggleDrone: () => void;
    volume: number;
    setVolume: (v: number) => void;
    midiDeviceName: string | null;
    pressedKeys: Set<string>;
    keyLabels: string[];
    pentatonicNotes: { note: string; freq: number }[];
    playNote: (index: number) => void;
}

export function useChimes(): UseChimesReturn {
    const engineRef = useRef<ChimesAudioEngine | null>(null);
    const [activeNotes, setActiveNotes] = useState<NoteEvent[]>([]);
    const [currentVoice, setCurrentVoice] = useState<ChimeVoice>('crystal');
    const [reverbOn, setReverbOn] = useState(true);
    const [droneOn, setDroneOn] = useState(false);
    const [volume, setVolumeState] = useState(0.7);
    const [midiDeviceName, setMidiDeviceName] = useState<string | null>(null);
    const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

    // Init engine
    useEffect(() => {
        const engine = new ChimesAudioEngine();
        engineRef.current = engine;
        return () => {
            engine.dispose();
            engineRef.current = null;
        };
    }, []);

    // Record a note event
    const recordNote = useCallback((event: NoteEvent) => {
        setActiveNotes(prev => {
            const next = [...prev, event];
            return next.length > 20 ? next.slice(-20) : next;
        });
    }, []);

    // ─── Keyboard handler ─────────────────────────────
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.repeat) return;
            const key = e.key.toLowerCase();
            if (!(key in KEY_MAP)) return;

            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

            const index = KEY_MAP[key];
            const engine = engineRef.current;
            if (!engine) return;

            const event = engine.playNoteByIndex(index, 0.7 + Math.random() * 0.25, KEY_LABELS[index]);
            if (event) recordNote(event);

            setPressedKeys(prev => new Set(prev).add(key));
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            setPressedKeys(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [recordNote]);

    // ─── Web MIDI ──────────────────────────────────────
    useEffect(() => {
        let midiAccess: any = null;

        const onMIDIMessage = (msg: any) => {
            const data = msg.data;
            const status = data[0];
            const note = data[1];
            const velocity = data[2];
            if ((status & 0xf0) === 0x90 && velocity > 0) {
                const engine = engineRef.current;
                if (!engine) return;
                const event = engine.playNoteByMidi(note, velocity / 127);
                if (event) recordNote(event);
            }
        };

        const connectMIDI = async () => {
            try {
                if (!navigator.requestMIDIAccess) return;
                midiAccess = await (navigator as any).requestMIDIAccess();
                midiAccess.inputs.forEach((input: any) => {
                    setMidiDeviceName(input.name || 'MIDI Device');
                    input.onmidimessage = onMIDIMessage;
                });
                midiAccess.onstatechange = () => {
                    if (!midiAccess) return;
                    let found = false;
                    midiAccess.inputs.forEach((input: any) => {
                        if (input.state === 'connected') {
                            found = true;
                            setMidiDeviceName(input.name || 'MIDI Device');
                            input.onmidimessage = onMIDIMessage;
                        }
                    });
                    if (!found) setMidiDeviceName(null);
                };
            } catch (err) {
                console.log('Web MIDI not available:', err);
            }
        };

        connectMIDI();
        return () => {
            if (midiAccess) {
                midiAccess.inputs.forEach((input: any) => { input.onmidimessage = null; });
            }
        };
    }, [recordNote]);

    // ─── Voice / Reverb / Drone / Volume setters ──────
    const setVoice = useCallback((v: ChimeVoice) => {
        setCurrentVoice(v);
        engineRef.current?.setVoice(v);
    }, []);

    const toggleReverb = useCallback(() => {
        setReverbOn(prev => {
            const next = !prev;
            engineRef.current?.setReverb(next);
            return next;
        });
    }, []);

    const toggleDrone = useCallback(() => {
        setDroneOn(prev => {
            const next = !prev;
            engineRef.current?.setDrone(next);
            return next;
        });
    }, []);

    const setVolume = useCallback((v: number) => {
        setVolumeState(v);
        engineRef.current?.setVolume(v);
    }, []);

    const playNote = useCallback((index: number) => {
        const engine = engineRef.current;
        if (!engine) return;
        const event = engine.playNoteByIndex(index, 0.7 + Math.random() * 0.25, KEY_LABELS[index]);
        if (event) recordNote(event);
    }, [recordNote]);

    return {
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
        keyLabels: KEY_LABELS,
        pentatonicNotes: engineRef.current?.pentatonicNotes || [],
        playNote,
    };
}
