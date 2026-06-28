import {
	clampIndex,
	type GeneratorOptions,
	nearest,
	type Pitch,
	pitchSpace,
} from "./pitchSpace.ts";

export type { GeneratorOptions, Pitch };
// Re-exported so the pitch-space toolkit stays reachable via this module.
export { clampIndex, nearest, pitchSpace };

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

// Pull each note that follows a sixteenth-or-shorter note inward until the leap
// into it is at most `maxSemitones`, so fast passages stay playable. `pitches` is
// ascending by MIDI, so stepping the index toward the previous note shrinks the
// interval. `protect` positions are never moved (e.g. cadence landings). Mutates.
export function limitFastLeaps(
	indices: number[],
	durations: number[],
	pitches: Pitch[],
	maxSemitones: number,
	protect?: Set<number>,
): void {
	for (let i = 1; i < indices.length; i++) {
		if (durations[i - 1] > 1 || protect?.has(i)) continue;
		const prevMidi = pitches[indices[i - 1]].midi;
		while (
			indices[i] !== indices[i - 1] &&
			Math.abs(pitches[indices[i]].midi - prevMidi) > maxSemitones
		)
			indices[i] += indices[i] > indices[i - 1] ? -1 : 1;
	}
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

// Stepwise-biased diatonic walk: first note near the tessitura anchor, leaps
// capped and resolved, last note a tonic approached by step. Consumes rng in
// order.
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
