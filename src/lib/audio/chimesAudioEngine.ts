// chimesAudioEngine.ts — Web Audio synthesizer for ScorePad
// Produces rich bell/bowl/drum tones locked to the pentatonic scale.

export type ChimeVoice = 'crystal' | 'bowl' | 'drum';

export interface NoteEvent {
    note: string;
    frequency: number;
    octave: number;
    velocity: number;
    keyLabel: string;
    timestamp: number;
}

// C Pentatonic across 3 octaves (C D E G A)
const PENTATONIC_NOTES = [
    { note: 'C3', freq: 130.81 },
    { note: 'D3', freq: 146.83 },
    { note: 'E3', freq: 164.81 },
    { note: 'G3', freq: 196.00 },
    { note: 'A3', freq: 220.00 },
    { note: 'C4', freq: 261.63 },
    { note: 'D4', freq: 293.66 },
    { note: 'E4', freq: 329.63 },
    { note: 'G4', freq: 392.00 },
    { note: 'A4', freq: 440.00 },
    { note: 'C5', freq: 523.25 },
    { note: 'D5', freq: 587.33 },
    { note: 'E5', freq: 659.25 },
    { note: 'G5', freq: 783.99 },
    { note: 'A5', freq: 880.00 },
];

// Quantise any MIDI note number to the nearest pentatonic frequency
const ALL_PENTATONIC_FREQS: number[] = [];
for (let oct = 1; oct <= 7; oct++) {
    [0, 2, 4, 7, 9].forEach(semitone => {
        ALL_PENTATONIC_FREQS.push(440 * Math.pow(2, (semitone - 9 + (oct - 4) * 12) / 12));
    });
}

function quantiseToScale(midiNote: number): { freq: number; note: string; octave: number } {
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
    let closest = ALL_PENTATONIC_FREQS[0];
    let minDist = Infinity;
    for (const pf of ALL_PENTATONIC_FREQS) {
        const dist = Math.abs(Math.log2(freq / pf));
        if (dist < minDist) {
            minDist = dist;
            closest = pf;
        }
    }
    const noteNum = Math.round(12 * Math.log2(closest / 440) + 69);
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(noteNum / 12) - 1;
    const name = names[noteNum % 12];
    return { freq: closest, note: `${name}${octave}`, octave };
}

const MAX_POLYPHONY = 8;

interface ActiveVoiceNode {
    oscNodes: OscillatorNode[];
    gainNode: GainNode;
    id: number;
}

export class ChimesAudioEngine {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private reverbGain: GainNode | null = null;
    private dryGain: GainNode | null = null;
    private convolver: ConvolverNode | null = null;
    private droneOsc: OscillatorNode | null = null;
    private droneGain: GainNode | null = null;

    private activeVoices: ActiveVoiceNode[] = [];
    private voiceIdCounter = 0;

    private _voice: ChimeVoice = 'crystal';
    private _reverbOn = true;
    private _droneOn = false;
    private _volume = 0.7;
    private _isInitialised = false;

    // ─── Public getters ────────────────────────────────
    get voice() { return this._voice; }
    get reverbOn() { return this._reverbOn; }
    get droneOn() { return this._droneOn; }
    get volume() { return this._volume; }
    get pentatonicNotes() { return PENTATONIC_NOTES; }

    // ─── Init ──────────────────────────────────────────
    init() {
        if (this._isInitialised) return;
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this._volume;
        this.masterGain.connect(this.ctx.destination);

        // Dry path
        this.dryGain = this.ctx.createGain();
        this.dryGain.gain.value = 0.6;
        this.dryGain.connect(this.masterGain);

        // Reverb path
        this.convolver = this.ctx.createConvolver();
        this.convolver.buffer = this.createReverbIR(3.0, 2.5);
        this.reverbGain = this.ctx.createGain();
        this.reverbGain.gain.value = this._reverbOn ? 0.55 : 0;
        this.convolver.connect(this.reverbGain);
        this.reverbGain.connect(this.masterGain);

        this._isInitialised = true;
    }

    // ─── Reverb impulse response (algorithmic) ─────────
    private createReverbIR(duration: number, decay: number): AudioBuffer {
        const ctx = this.ctx!;
        const length = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const data = buffer.getChannelData(ch);
            for (let i = 0; i < length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
            }
        }
        return buffer;
    }

    // ─── Ensure audio context is running ───────────────
    resume() {
        if (this.ctx?.state === 'suspended') this.ctx.resume();
    }

    // ─── Play a note by index (0–14) ──────────────────
    playNoteByIndex(index: number, velocity = 0.8, keyLabel = ''): NoteEvent | null {
        if (index < 0 || index >= PENTATONIC_NOTES.length) return null;
        this.init();
        this.resume();
        const { note, freq } = PENTATONIC_NOTES[index];
        const octave = parseInt(note.slice(-1));
        this.triggerVoice(freq, velocity);
        return { note, frequency: freq, octave, velocity, keyLabel, timestamp: Date.now() };
    }

    // ─── Play a note by MIDI note number ──────────────
    playNoteByMidi(midiNote: number, velocity = 0.8): NoteEvent | null {
        this.init();
        this.resume();
        const { freq, note, octave } = quantiseToScale(midiNote);
        this.triggerVoice(freq, velocity);
        return { note, frequency: freq, octave, velocity, keyLabel: `MIDI ${midiNote}`, timestamp: Date.now() };
    }

    // ─── Core voice trigger ────────────────────────────
    private triggerVoice(freq: number, velocity: number) {
        if (!this.ctx || !this.dryGain || !this.convolver) return;

        // Voice stealing
        if (this.activeVoices.length >= MAX_POLYPHONY) {
            const oldest = this.activeVoices.shift();
            if (oldest) {
                oldest.gainNode.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
                setTimeout(() => {
                    oldest.oscNodes.forEach(o => { try { o.stop(); } catch (_) { /* */ } });
                }, 200);
            }
        }

        const now = this.ctx.currentTime;
        const voiceGain = this.ctx.createGain();
        voiceGain.gain.value = 1; // Passthrough — individual osc gains handle envelopes

        // Route to dry + reverb
        voiceGain.connect(this.dryGain);
        voiceGain.connect(this.convolver);

        const oscNodes: OscillatorNode[] = [];

        switch (this._voice) {
            case 'crystal':
                oscNodes.push(...this.createCrystalChime(freq, voiceGain, velocity, now));
                break;
            case 'bowl':
                oscNodes.push(...this.createTibetanBowl(freq, voiceGain, velocity, now));
                break;
            case 'drum':
                oscNodes.push(...this.createHangDrum(freq, voiceGain, velocity, now));
                break;
        }

        const id = this.voiceIdCounter++;
        const voiceNode: ActiveVoiceNode = { oscNodes, gainNode: voiceGain, id };
        this.activeVoices.push(voiceNode);

        // Auto-cleanup after decay
        const decayTime = this._voice === 'drum' ? 2500 : 4500;
        setTimeout(() => {
            this.activeVoices = this.activeVoices.filter(v => v.id !== id);
            oscNodes.forEach(o => { try { o.stop(); } catch (_) { /* */ } });
        }, decayTime);
    }

    // ─── Crystal Chime: sine + shimmer harmonics ──────
    private createCrystalChime(freq: number, dest: GainNode, vel: number, now: number): OscillatorNode[] {
        const ctx = this.ctx!;
        const oscs: OscillatorNode[] = [];

        // Fundamental
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = freq;
        const g1 = ctx.createGain();
        g1.gain.setValueAtTime(0, now);
        g1.gain.linearRampToValueAtTime(vel * 0.5, now + 0.005);
        g1.gain.exponentialRampToValueAtTime(0.001, now + 3.5);
        osc1.connect(g1);
        g1.connect(dest);
        osc1.start(now);
        oscs.push(osc1);

        // 2nd harmonic (octave) — shimmer
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = freq * 2.001; // Slight detune for shimmer
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0, now);
        g2.gain.linearRampToValueAtTime(vel * 0.22, now + 0.005);
        g2.gain.exponentialRampToValueAtTime(0.001, now + 2.8);
        osc2.connect(g2);
        g2.connect(dest);
        osc2.start(now);
        oscs.push(osc2);

        // 3rd partial (twelfth, for bell character)
        const osc3 = ctx.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.value = freq * 3.01;
        const g3 = ctx.createGain();
        g3.gain.setValueAtTime(0, now);
        g3.gain.linearRampToValueAtTime(vel * 0.1, now + 0.003);
        g3.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
        osc3.connect(g3);
        g3.connect(dest);
        osc3.start(now);
        oscs.push(osc3);

        return oscs;
    }

    // ─── Tibetan Bowl: detuned pair with beating ──────
    private createTibetanBowl(freq: number, dest: GainNode, vel: number, now: number): OscillatorNode[] {
        const ctx = this.ctx!;
        const oscs: OscillatorNode[] = [];
        const detune = 1.5; // Hz beating

        const makeOsc = (f: number, amp: number, decay: number) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = f;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(amp, now + 0.01);
            g.gain.exponentialRampToValueAtTime(0.001, now + decay);
            osc.connect(g);
            g.connect(dest);
            osc.start(now);
            oscs.push(osc);
        };

        // Fundamental pair (beating)
        makeOsc(freq, vel * 0.4, 4.0);
        makeOsc(freq + detune, vel * 0.4, 4.0);

        // Low sub-harmonic
        makeOsc(freq * 0.5, vel * 0.15, 3.5);

        // High shimmer
        makeOsc(freq * 2.02, vel * 0.08, 2.5);

        return oscs;
    }

    // ─── Hang Drum: percussive sine + sub ─────────────
    private createHangDrum(freq: number, dest: GainNode, vel: number, now: number): OscillatorNode[] {
        const ctx = this.ctx!;
        const oscs: OscillatorNode[] = [];

        // Main tone — percussive attack
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(freq * 1.02, now);
        osc1.frequency.exponentialRampToValueAtTime(freq, now + 0.08);
        const g1 = ctx.createGain();
        g1.gain.setValueAtTime(0, now);
        g1.gain.linearRampToValueAtTime(vel * 0.55, now + 0.003);
        g1.gain.exponentialRampToValueAtTime(vel * 0.2, now + 0.15);
        g1.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
        osc1.connect(g1);
        g1.connect(dest);
        osc1.start(now);
        oscs.push(osc1);

        // Sub-harmonic body
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = freq * 0.5;
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0, now);
        g2.gain.linearRampToValueAtTime(vel * 0.25, now + 0.005);
        g2.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
        osc2.connect(g2);
        g2.connect(dest);
        osc2.start(now);
        oscs.push(osc2);

        // Click transient
        const osc3 = ctx.createOscillator();
        osc3.type = 'triangle';
        osc3.frequency.value = freq * 4;
        const g3 = ctx.createGain();
        g3.gain.setValueAtTime(vel * 0.12, now);
        g3.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc3.connect(g3);
        g3.connect(dest);
        osc3.start(now);
        oscs.push(osc3);

        return oscs;
    }

    // ─── Settings ──────────────────────────────────────
    setVoice(voice: ChimeVoice) {
        this._voice = voice;
    }

    setReverb(on: boolean) {
        this._reverbOn = on;
        if (this.reverbGain && this.ctx) {
            this.reverbGain.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.3);
        }
    }

    setVolume(vol: number) {
        this._volume = Math.max(0, Math.min(1, vol));
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setTargetAtTime(this._volume, this.ctx.currentTime, 0.05);
        }
    }

    // ─── Drone ─────────────────────────────────────────
    setDrone(on: boolean) {
        this._droneOn = on;
        this.init();
        this.resume();
        if (!this.ctx || !this.dryGain) return;

        if (on && !this.droneOsc) {
            this.droneOsc = this.ctx.createOscillator();
            this.droneOsc.type = 'sine';
            this.droneOsc.frequency.value = PENTATONIC_NOTES[0].freq; // Root C3

            this.droneGain = this.ctx.createGain();
            this.droneGain.gain.value = 0;
            this.droneGain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 2);

            // Add subtle LFO for organic feel
            const lfo = this.ctx.createOscillator();
            const lfoGain = this.ctx.createGain();
            lfo.frequency.value = 0.15;
            lfoGain.gain.value = 1.5;
            lfo.connect(lfoGain);
            lfoGain.connect(this.droneOsc.frequency);
            lfo.start();

            this.droneOsc.connect(this.droneGain);
            this.droneGain.connect(this.dryGain);
            if (this.convolver) this.droneGain.connect(this.convolver);
            this.droneOsc.start();
        } else if (!on && this.droneOsc) {
            if (this.droneGain && this.ctx) {
                this.droneGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
            }
            const oscRef = this.droneOsc;
            setTimeout(() => { try { oscRef.stop(); } catch (_) { /* */ } }, 1500);
            this.droneOsc = null;
            this.droneGain = null;
        }
    }

    // ─── Cleanup ───────────────────────────────────────
    dispose() {
        this.setDrone(false);
        this.activeVoices.forEach(v => {
            v.oscNodes.forEach(o => { try { o.stop(); } catch (_) { /* */ } });
        });
        this.activeVoices = [];
        if (this.ctx) {
            this.ctx.close();
            this.ctx = null;
        }
        this._isInitialised = false;
    }
}
