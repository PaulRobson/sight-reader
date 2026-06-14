import type { Note } from "./generateMelody.ts";
import type { AccidentalBreadth } from "./gradeDifficulty.ts";

// Per-note probability of a chromatic inflection, by §5 accidental breadth.
const BREADTH_PROBABILITY: Record<AccidentalBreadth, number> = {
	none: 0,
	rare: 0.03,
	passing: 0.06,
	occasional: 0.1,
	regular: 0.15,
	chromatic: 0.2,
	frequent: 0.28,
	modulation: 0.35,
};

type AccidentalArgs = {
	scalePitchClasses: Set<number>;
	lowestMidi: number;
	highestMidi: number;
};

const pitchClass = (midi: number) => ((midi % 12) + 12) % 12;

// A chromatic neighbour of a diatonic note: shift a semitone to a pitch outside
// the key, keeping the letter (so a single ♯/♭) and staying in range. The
// out-of-key guard also rejects awkward spellings (E♯/B♯/C♭/F♭ map to in-key
// pitches). Returns null when neither direction is clean.
function inflect(note: Note, a: AccidentalArgs): Note | null {
	const shift = (dir: number): Note | null => {
		const accidental = note.accidental + dir;
		const midi = note.midi + dir;
		if (Math.abs(accidental) > 1) return null;
		if (midi < a.lowestMidi || midi > a.highestMidi) return null;
		if (a.scalePitchClasses.has(pitchClass(midi))) return null;
		return { ...note, accidental, midi };
	};
	return shift(1) ?? shift(-1);
}

// Chromatically inflect some interior notes at the grade's breadth. The opening
// note and the final two-note cadence are left alone (so the piece still resolves
// by step to the tonic), as are rests; the underlying rhythm is unchanged.
// Deterministic for a given rng.
export function insertAccidentals(
	notes: Note[],
	breadth: AccidentalBreadth,
	args: AccidentalArgs,
	rng: () => number,
): Note[] {
	const probability = BREADTH_PROBABILITY[breadth];
	if (probability <= 0) return notes;
	return notes.map((note, i) => {
		const interior = i > 0 && i < notes.length - 2;
		if (!interior || note.rest || rng() >= probability) return note;
		return inflect(note, args) ?? note;
	});
}
