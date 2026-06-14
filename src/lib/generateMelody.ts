import { mulberry32 } from "./mulberry32.ts";
import { rhythm } from "./rhythm.ts";
import { type ScaleNote, scale } from "./scale.ts";

export type GeneratorOptions = {
	seed: number;
	key: string; // written tonic, e.g. "C"
	bars: number;
	lowestMidi: number; // range clamp (inclusive)
	highestMidi: number;
	stepBias: number; // 0..1 probability of a stepwise move
	maxLeap: number; // largest leap in scale steps (a 3rd = 2)
};

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

type Pitch = Omit<Note, "duration">;

// All diatonic pitches of the key within range, ascending by MIDI.
function buildPitches(key: string, lo: number, hi: number): Pitch[] {
	const degrees = scale.major(key);
	const pitches: Pitch[] = [];
	for (let octave = 0; octave <= 9; octave++) {
		for (const d of degrees) {
			const midi = scale.toMidi(d, octave);
			if (midi >= lo && midi <= hi) {
				pitches.push({
					midi,
					letter: d.letter,
					accidental: d.accidental,
					octave,
				});
			}
		}
	}
	return pitches.sort((a, b) => a.midi - b.midi);
}

function tonicIndices(pitches: Pitch[], tonic: ScaleNote): number[] {
	const out: number[] = [];
	pitches.forEach((p, i) => {
		if (p.letter === tonic.letter && p.accidental === tonic.accidental)
			out.push(i);
	});
	return out;
}

function nearest(indices: number[], target: number): number {
	return indices.reduce(
		(best, i) => (Math.abs(i - target) < Math.abs(best - target) ? i : best),
		indices[0],
	);
}

function nextIndex(
	prev: number,
	opts: GeneratorOptions,
	len: number,
	rng: () => number,
) {
	const isStep = rng() < opts.stepBias;
	const magnitude = isStep ? 1 : 2 + Math.floor(rng() * (opts.maxLeap - 1));
	const dir = rng() < 0.5 ? -1 : 1;
	let cand = prev + magnitude * dir;
	if (cand < 0 || cand >= len) cand = prev - magnitude * dir; // reflect inward
	return Math.max(0, Math.min(len - 1, cand));
}

function drawDurations(bars: number, rng: () => number): number[] {
	const durations: number[] = [];
	for (let b = 0; b < bars; b++) {
		durations.push(...rhythm.draw(rhythm.cells4x4, rng).durations);
	}
	return durations;
}

// Last note = tonic, approached by step (leading tone or supertonic).
function finalizeCadence(indices: number[], tonics: number[]): void {
	const n = indices.length;
	if (n >= 3) {
		const finalTonic = nearest(tonics, indices[n - 2]);
		indices[n - 1] = finalTonic;
		indices[n - 2] = finalTonic - 1 >= 0 ? finalTonic - 1 : finalTonic + 1;
	} else if (n === 2) {
		indices[1] = nearest(tonics, indices[0]);
	}
}

export function generateMelody(opts: GeneratorOptions): Melody {
	const rng = mulberry32(opts.seed);
	const degrees = scale.major(opts.key);
	const pitches = buildPitches(opts.key, opts.lowestMidi, opts.highestMidi);
	const durations = drawDurations(opts.bars, rng);
	const tonics = tonicIndices(pitches, degrees[0]);

	const indices: number[] = [nearest(tonics, Math.floor(pitches.length / 2))];
	for (let i = 1; i < durations.length; i++) {
		indices.push(nextIndex(indices[i - 1], opts, pitches.length, rng));
	}
	finalizeCadence(indices, tonics);

	const notes: Note[] = indices.map((idx, i) => ({
		...pitches[idx],
		duration: durations[i],
	}));
	return {
		key: opts.key,
		bars: opts.bars,
		barUnits: rhythm.barUnits4x4,
		notes,
	};
}
