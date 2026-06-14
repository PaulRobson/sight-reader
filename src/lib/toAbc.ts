import type { Melody, Note } from "./generateMelody.ts";
import { scale } from "./scale.ts";

export type SerializeOptions = {
	title?: string;
	tempo?: number; // BPM for the quarter note (Q:1/4=...)
	program?: number; // General MIDI program
	clef?: string; // "treble" | "bass" | "alto" | "tenor"
	meter?: string; // time signature, e.g. "3/4"; bar lines follow melody.barUnits
	grandStaff?: boolean; // split across treble + bass staves (piano)
};

const DEFAULTS = {
	title: "Exercise",
	tempo: 70,
	program: 0,
	clef: "treble",
	meter: "4/4",
	grandStaff: false,
};

const MIDDLE_C = 60;

const ACCIDENTAL_PREFIX: Record<number, string> = {
	"-2": "__",
	"-1": "_",
	0: "=",
	1: "^",
	2: "^^",
};

// Default accidental each letter carries from the key signature.
function keySignature(key: string): Record<string, number> {
	const sig: Record<string, number> = {};
	for (const d of scale.major(key)) sig[d.letter] = d.accidental;
	return sig;
}

function pitchLetters(note: Note): string {
	return note.octave >= 5
		? `${note.letter.toLowerCase()}${"'".repeat(note.octave - 5)}`
		: `${note.letter.toUpperCase()}${",".repeat(Math.max(0, 4 - note.octave))}`;
}

// L:1/16, so a slot's duration in sixteenth units is its abc length multiplier.
// An explicit accidental is emitted only when the note deviates from what's
// currently in force (key signature, or an earlier accidental this bar), and
// that deviation is recorded in `bar` so it persists to the bar line.
function noteToken(
	note: Note,
	keySig: Record<string, number>,
	bar: Record<string, number>,
): string {
	if (note.rest) return note.duration === 1 ? "z" : `z${note.duration}`;
	const id = `${note.letter}${note.octave}`;
	const inForce = id in bar ? bar[id] : (keySig[note.letter] ?? 0);
	let prefix = "";
	if (note.accidental !== inForce) {
		prefix = ACCIDENTAL_PREFIX[note.accidental] ?? "";
		bar[id] = note.accidental;
	}
	const length = note.duration === 1 ? "" : `${note.duration}`;
	return `${prefix}${pitchLetters(note)}${length}`;
}

// One bar's tokens. An entirely-rested bar collapses to `Z` (a whole-measure
// rest) rather than a string of individual rests. Accidentals are local to the
// bar, so the persistence state starts fresh here.
function renderBar(notes: Note[], keySig: Record<string, number>): string {
	if (notes.every((n) => n.rest)) return "Z";
	const bar: Record<string, number> = {};
	return notes.map((n) => noteToken(n, keySig, bar)).join(" ");
}

function noteStream(key: string, barUnits: number, notes: Note[]): string {
	const keySig = keySignature(key);
	const bars: string[] = [];
	let current: Note[] = [];
	let acc = 0;
	for (const note of notes) {
		current.push(note);
		acc += note.duration;
		if (acc % barUnits === 0) {
			bars.push(renderBar(current, keySig));
			current = [];
		}
	}
	if (current.length > 0) bars.push(renderBar(current, keySig));
	return `${bars.join(" | ")} |`;
}

// Split a single line across a grand staff: each pitched note goes to the staff
// for its register, the other staff carries an aligned rest (so bars line up).
function splitGrandStaff(notes: Note[]): { treble: Note[]; bass: Note[] } {
	const rest = (n: Note): Note => ({ ...n, rest: true });
	return {
		treble: notes.map((n) => (!n.rest && n.midi >= MIDDLE_C ? n : rest(n))),
		bass: notes.map((n) => (!n.rest && n.midi < MIDDLE_C ? n : rest(n))),
	};
}

// Written pitch only; transposition is applied at synth time, never here.
// L:1/16 is the default note length for every meter, so durations stay integer
// length multipliers; bar lines are placed by melody.barUnits in noteStream.
export function toAbc(melody: Melody, options: SerializeOptions = {}): string {
	const { title, tempo, program, clef, meter, grandStaff } = {
		...DEFAULTS,
		...options,
	};
	const head = ["X:1", `T:${title}`, `M:${meter}`, "L:1/16", `Q:1/4=${tempo}`];
	if (grandStaff) {
		const { treble, bass } = splitGrandStaff(melody.notes);
		return [
			...head,
			`K:${melody.key}`,
			`%%MIDI program ${program}`,
			"%%score {1 2}",
			"V:1 clef=treble",
			"V:2 clef=bass",
			`[V:1] ${noteStream(melody.key, melody.barUnits, treble)}`,
			`[V:2] ${noteStream(melody.key, melody.barUnits, bass)}`,
		].join("\n");
	}
	return [
		...head,
		`K:${melody.key} clef=${clef}`,
		`%%MIDI program ${program}`,
		noteStream(melody.key, melody.barUnits, melody.notes),
	].join("\n");
}
