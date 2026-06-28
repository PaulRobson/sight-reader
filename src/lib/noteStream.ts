import type { Note } from "./generateMelody.ts";
import { scale } from "./scale.ts";

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
function decorations(note: Note): string {
	return note.decorations?.map((d) => `!${d}!`).join("") ?? "";
}

function noteToken(
	note: Note,
	keySig: Record<string, number>,
	bar: Record<string, number>,
): string {
	const deco = decorations(note);
	if (note.rest)
		return `${deco}${note.duration === 1 ? "z" : `z${note.duration}`}`;
	const id = `${note.letter}${note.octave}`;
	const inForce = id in bar ? bar[id] : (keySig[note.letter] ?? 0);
	let prefix = "";
	if (note.accidental !== inForce) {
		prefix = ACCIDENTAL_PREFIX[note.accidental] ?? "";
		bar[id] = note.accidental;
	}
	const length = note.duration === 1 ? "" : `${note.duration}`;
	return `${deco}${prefix}${pitchLetters(note)}${length}`;
}

// Sixteenths per beam group: a quarter for simple meters, a dotted quarter for
// compound (x/8 with a multiple-of-3 numerator), a half for cut time. abc beams
// notes written without a space between them, broken at these beat boundaries.
function beatUnits(meter: string): number {
	const [num, den] = meter.split("/").map(Number);
	if (den === 2) return 8;
	if (den === 8 && num % 3 === 0) return 6;
	return 4;
}

// One bar's tokens. An entirely-rested bar collapses to `Z` (a whole-measure
// rest). Sub-quarter notes inside the same beat are beamed (no separating
// space); quarters, rests, and beat boundaries break the beam. Accidentals are
// local to the bar, so the persistence state starts fresh here.
function renderBar(
	notes: Note[],
	keySig: Record<string, number>,
	beat: number,
): string {
	if (notes.every((n) => n.rest)) return "Z";
	const bar: Record<string, number> = {};
	let out = "";
	let pos = 0;
	let prevBeamable = false;
	for (const note of notes) {
		const token = noteToken(note, keySig, bar);
		const beamable = !note.rest && note.duration < 4;
		const beamed = out !== "" && beamable && prevBeamable && pos % beat !== 0;
		out += beamed ? token : `${out === "" ? "" : " "}${token}`;
		pos += note.duration;
		prevBeamable = beamable;
	}
	return out;
}

// The barred abc note stream for one voice. Bar lines follow `barUnits`; beaming
// follows the meter's beat.
export function noteStream(
	key: string,
	barUnits: number,
	notes: Note[],
	meter: string,
): string {
	const keySig = keySignature(key);
	const beat = beatUnits(meter);
	const bars: string[] = [];
	let current: Note[] = [];
	let acc = 0;
	for (const note of notes) {
		current.push(note);
		acc += note.duration;
		if (acc % barUnits === 0) {
			bars.push(renderBar(current, keySig, beat));
			current = [];
		}
	}
	if (current.length > 0) bars.push(renderBar(current, keySig, beat));
	return `${bars.join(" | ")} |`;
}

// Split a single line across a grand staff: each pitched note goes to the staff
// for its register, the other staff carries an aligned rest (so bars line up).
export function splitGrandStaff(notes: Note[]): {
	treble: Note[];
	bass: Note[];
} {
	const rest = (n: Note): Note => ({
		...n,
		rest: true,
		decorations: undefined,
	});
	return {
		treble: notes.map((n) => (!n.rest && n.midi >= MIDDLE_C ? n : rest(n))),
		bass: notes.map((n) => (!n.rest && n.midi < MIDDLE_C ? n : rest(n))),
	};
}
