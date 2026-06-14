import { mulberry32 } from "./mulberry32.ts";
import { type GeneratorOptions, type Pitch, pitchWalk } from "./pitchWalk.ts";
import { rhythm } from "./rhythm.ts";

export type { GeneratorOptions } from "./pitchWalk.ts";

export type Note = {
	midi: number;
	letter: string;
	accidental: number;
	octave: number;
	duration: number; // sixteenth-note units
};

export type Melody = {
	key: string;
	bars: number;
	barUnits: number;
	notes: Note[];
};

// Zip pitches with their slot durations (both must be the same length).
export function toNotes(pitches: Pitch[], durations: number[]): Note[] {
	return pitches.map((p, i) => ({ ...p, duration: durations[i] }));
}

export function generateMelody(opts: GeneratorOptions): Melody {
	const rng = mulberry32(opts.seed);
	const durations = rhythm.drawBars(opts.bars, rng);
	const pitches = pitchWalk(opts, durations.length, rng);
	return {
		key: opts.key,
		bars: opts.bars,
		barUnits: rhythm.barUnits4x4,
		notes: toNotes(pitches, durations),
	};
}
