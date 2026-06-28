import type { Note } from "./generateMelody.ts";

// Replace interior note slots with rests at the given per-slot probability
// (§4 step 2). The first and last slots stay pitched so the piece still opens
// and resolves on a real note. Durations are unchanged and the underlying pitch
// is retained (the melodic walk flows through a rested slot); only rendering
// and playback treat it as silent. Deterministic for a given rng.
export function insertRests(
	notes: Note[],
	probability: number,
	rng: () => number,
): Note[] {
	if (probability <= 0) return notes;
	return notes.map((note, i) => {
		const interior = i > 0 && i < notes.length - 1;
		return interior && rng() < probability ? { ...note, rest: true } : note;
	});
}

// No whole-bar rests: a bar of silence reads as a gap in a short sight-reading
// exercise, so when every slot in a bar is a rest, restore (un-rest) its first
// slot to the retained pitch. Every bar then keeps at least one sounding note.
export function preventFullBarRests(notes: Note[], barUnits: number): Note[] {
	const out = notes.map((n) => ({ ...n }));
	let acc = 0;
	let barStart = 0;
	for (let i = 0; i < out.length; i++) {
		acc += out[i].duration;
		if (acc % barUnits !== 0) continue;
		if (out.slice(barStart, i + 1).every((n) => n.rest))
			out[barStart].rest = false;
		barStart = i + 1;
	}
	return out;
}
