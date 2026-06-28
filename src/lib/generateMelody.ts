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
	rest?: boolean; // slot is silent; pitch fields retained for walk continuity
	decorations?: string[]; // abc decoration tokens (e.g. "f", "crescendo("), no !!
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
	const meter = opts.meter ?? rhythm.meters["4/4"];
	const durations = rhythm.drawBars(meter, opts.bars, rng);
	const pitches = pitchWalk(opts, durations.length, rng);
	return {
		key: opts.key,
		bars: opts.bars,
		barUnits: meter.barUnits,
		notes: toNotes(pitches, durations),
	};
}
