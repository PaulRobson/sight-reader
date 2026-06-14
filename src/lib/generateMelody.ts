import { mulberry32 } from "./mulberry32.ts";
import { type GeneratorOptions, pitchWalk } from "./pitchWalk.ts";
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

function drawDurations(bars: number, rng: () => number): number[] {
	const durations: number[] = [];
	for (let b = 0; b < bars; b++) {
		durations.push(...rhythm.draw(rhythm.cells4x4, rng).durations);
	}
	return durations;
}

export function generateMelody(opts: GeneratorOptions): Melody {
	const rng = mulberry32(opts.seed);
	const durations = drawDurations(opts.bars, rng);
	const pitches = pitchWalk(opts, durations.length, rng);
	const notes: Note[] = pitches.map((p, i) => ({
		...p,
		duration: durations[i],
	}));
	return {
		key: opts.key,
		bars: opts.bars,
		barUnits: rhythm.barUnits4x4,
		notes,
	};
}
