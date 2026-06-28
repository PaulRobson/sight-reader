import type { Meter } from "./rhythm.ts";
import { type ScaleNote, scale } from "./scale.ts";

export type GeneratorOptions = {
	seed: number;
	key: string; // written key, e.g. "C" or "Am" (trailing m = minor)
	bars: number;
	lowestMidi: number; // range clamp (inclusive)
	highestMidi: number;
	stepBias: number; // 0..1 probability of a stepwise move
	maxLeap: number; // largest leap in scale steps (a 3rd = 2)
	meter?: Meter; // rhythm source; defaults to 4/4 when absent
	centerMidi?: number; // tessitura anchor; defaults to the range midpoint
};

export type Pitch = {
	midi: number;
	letter: string;
	accidental: number;
	octave: number;
};

export type PitchSpace = {
	pitches: Pitch[];
	tonics: number[]; // indices of tonic pitches
	start: number; // tonic nearest the tessitura anchor, the walk's start
	cadenceTargets: number[]; // degree 2/5 indices for interior half-cadences
};

// All diatonic pitches of the key within range, ascending by MIDI.
function buildPitches(key: string, lo: number, hi: number): Pitch[] {
	const degrees = scale.degrees(key);
	const pitches: Pitch[] = [];
	for (let octave = 0; octave <= 9; octave++) {
		for (const d of degrees) {
			const midi = scale.toMidi(d, octave);
			if (midi >= lo && midi <= hi)
				pitches.push({
					midi,
					letter: d.letter,
					accidental: d.accidental,
					octave,
				});
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

// Ladder index whose pitch is closest to a target MIDI.
function indexNearestMidi(pitches: Pitch[], midi: number): number {
	return pitches.reduce(
		(best, p, i) =>
			Math.abs(p.midi - midi) < Math.abs(pitches[best].midi - midi) ? i : best,
		0,
	);
}

// The diatonic pitch ladder for a key/range plus its tonic and cadence anchors.
export function pitchSpace(opts: GeneratorOptions): PitchSpace {
	const degrees = scale.degrees(opts.key);
	const pitches = buildPitches(opts.key, opts.lowestMidi, opts.highestMidi);
	const tonics = degreeIndices(pitches, degrees[0]);
	const center =
		opts.centerMidi === undefined
			? Math.floor(pitches.length / 2)
			: indexNearestMidi(pitches, opts.centerMidi);
	const start = nearest(tonics, center);
	const cadenceTargets = [
		...degreeIndices(pitches, degrees[1]),
		...degreeIndices(pitches, degrees[4]),
	].sort((a, b) => a - b);
	return { pitches, tonics, start, cadenceTargets };
}
