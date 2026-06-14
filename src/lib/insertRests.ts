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

// No more than one whole-bar rest in a row: when a bar is entirely rests and the
// previous bar was too, restore (un-rest) this bar's first slot so the line is
// never silent for two bars running. The retained pitch is reused.
export function limitFullBarRests(notes: Note[], barUnits: number): Note[] {
	const out = notes.map((n) => ({ ...n }));
	let acc = 0;
	let barStart = 0;
	let prevBarAllRest = false;
	for (let i = 0; i < out.length; i++) {
		acc += out[i].duration;
		if (acc % barUnits !== 0) continue;
		const allRest = out.slice(barStart, i + 1).every((n) => n.rest);
		if (allRest && prevBarAllRest) {
			out[barStart].rest = false;
			prevBarAllRest = false;
		} else {
			prevBarAllRest = allRest;
		}
		barStart = i + 1;
	}
	return out;
}
