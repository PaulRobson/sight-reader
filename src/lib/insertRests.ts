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
