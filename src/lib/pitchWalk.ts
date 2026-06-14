import type { Meter } from "./rhythm.ts";
import { type ScaleNote, scale } from "./scale.ts";

export type GeneratorOptions = {
	seed: number;
	key: string; // written tonic, e.g. "C"
	bars: number;
	lowestMidi: number; // range clamp (inclusive)
	highestMidi: number;
	stepBias: number; // 0..1 probability of a stepwise move
	maxLeap: number; // largest leap in scale steps (a 3rd = 2)
	meter?: Meter; // rhythm source; defaults to 4/4 when absent
};

export type Pitch = {
	midi: number;
	letter: string;
	accidental: number;
	octave: number;
};

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

// Ladder positions whose pitch is the given scale degree (matched by spelling).
function degreeIndices(pitches: Pitch[], degree: ScaleNote): number[] {
	const out: number[] = [];
	pitches.forEach((p, i) => {
		if (p.letter === degree.letter && p.accidental === degree.accidental)
			out.push(i);
	});
	return out;
}

export function nearest(indices: number[], target: number): number {
	return indices.reduce(
		(best, i) => (Math.abs(i - target) < Math.abs(best - target) ? i : best),
		indices[0],
	);
}

export const clampIndex = (v: number, len: number) =>
	Math.max(0, Math.min(len - 1, v));

// A bounded signed move in scale steps: a step (±1) with probability stepBias,
// else a leap up to maxLeap. Used both inside the walk and for phrase joins.
export function stepDelta(opts: GeneratorOptions, rng: () => number): number {
	const isStep = rng() < opts.stepBias;
	const magnitude = isStep ? 1 : 2 + Math.floor(rng() * (opts.maxLeap - 1));
	return (rng() < 0.5 ? -1 : 1) * magnitude;
}

function freeMove(
	prev: number,
	opts: GeneratorOptions,
	len: number,
	rng: () => number,
) {
	const delta = stepDelta(opts, rng);
	const cand = prev + delta;
	return cand < 0 || cand >= len ? prev - delta : cand; // reflect inward
}

function nextIndex(
	prev: number,
	prevDelta: number,
	opts: GeneratorOptions,
	len: number,
	rng: () => number,
) {
	// Leap resolution (§4): after a leap larger than a third (> 2 scale steps),
	// step back in the opposite direction.
	if (Math.abs(prevDelta) > 2)
		return clampIndex(prev - Math.sign(prevDelta), len);
	return clampIndex(freeMove(prev, opts, len, rng), len);
}

export function buildIndices(
	count: number,
	start: number,
	opts: GeneratorOptions,
	len: number,
	rng: () => number,
): number[] {
	const indices = [start];
	for (let i = 1; i < count; i++) {
		const prevDelta = i >= 2 ? indices[i - 1] - indices[i - 2] : 0;
		indices.push(nextIndex(indices[i - 1], prevDelta, opts, len, rng));
	}
	return indices;
}

// Last note = tonic, approached by step (leading tone or supertonic).
export function finalizeCadence(indices: number[], tonics: number[]): void {
	const n = indices.length;
	if (n >= 3) {
		const finalTonic = nearest(tonics, indices[n - 2]);
		indices[n - 1] = finalTonic;
		indices[n - 2] = finalTonic - 1 >= 0 ? finalTonic - 1 : finalTonic + 1;
	} else if (n === 2) {
		indices[1] = nearest(tonics, indices[0]);
	}
}

export type PitchSpace = {
	pitches: Pitch[];
	tonics: number[]; // indices of tonic pitches
	start: number; // mid-range tonic, the walk's anchor
	cadenceTargets: number[]; // degree 2/5 indices for interior half-cadences
};

// The diatonic pitch ladder for a key/range plus its tonic and cadence anchors.
export function pitchSpace(opts: GeneratorOptions): PitchSpace {
	const degrees = scale.major(opts.key);
	const pitches = buildPitches(opts.key, opts.lowestMidi, opts.highestMidi);
	const tonics = degreeIndices(pitches, degrees[0]);
	const start = nearest(tonics, Math.floor(pitches.length / 2));
	const cadenceTargets = [
		...degreeIndices(pitches, degrees[1]),
		...degreeIndices(pitches, degrees[4]),
	].sort((a, b) => a - b);
	return { pitches, tonics, start, cadenceTargets };
}

// Stepwise-biased diatonic walk: first note near mid-range tonic, leaps capped
// and resolved, last note a tonic approached by step. Consumes rng in order.
export function pitchWalk(
	opts: GeneratorOptions,
	count: number,
	rng: () => number,
): Pitch[] {
	const { pitches, tonics, start } = pitchSpace(opts);
	const indices = buildIndices(count, start, opts, pitches.length, rng);
	finalizeCadence(indices, tonics);
	return indices.map((i) => pitches[i]);
}
