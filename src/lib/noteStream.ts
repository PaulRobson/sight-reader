import { abcDuration } from "./abcDuration.ts";
import type { Note } from "./generateMelody.ts";
import { scale } from "./scale.ts";

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

// abc has no !staccato! decoration; the staccato dot is the "." shorthand. Other
// tokens (dynamics, accent, tenuto) are wrapped !token!.
const SHORTHAND: Record<string, string> = { staccato: "." };

function decorations(note: Note): string {
	return note.decorations?.map((d) => SHORTHAND[d] ?? `!${d}!`).join("") ?? "";
}

// Accidental prefix, emitted only when the note deviates from what's in force
// (key signature or an earlier accidental this bar), recording it so it persists.
function accidentalToken(
	note: Note,
	keySig: Record<string, number>,
	bar: Record<string, number>,
): string {
	const id = `${note.letter}${note.octave}`;
	const inForce = id in bar ? bar[id] : (keySig[note.letter] ?? 0);
	if (note.accidental === inForce) return "";
	bar[id] = note.accidental;
	return ACCIDENTAL_PREFIX[note.accidental] ?? "";
}

// Accidental + pitch + length, tie-splitting a non-representable duration into
// clean noteheads ("-"), with the accidental only on the first.
function pitchToken(note: Note, acc: string): string {
	const pitch = pitchLetters(note);
	return abcDuration
		.split(note.duration)
		.map((p, i) => `${i === 0 ? acc : ""}${pitch}${abcDuration.lengthOf(p)}`)
		.join("-");
}

// L:1/16, so a slot's duration in sixteenth units is its abc length multiplier;
// slurs wrap the note in parens, decorations prefix it.
function noteToken(
	note: Note,
	keySig: Record<string, number>,
	bar: Record<string, number>,
): string {
	const deco = decorations(note);
	if (note.rest) return `${deco}z${abcDuration.lengthOf(note.duration)}`;
	const body = pitchToken(note, accidentalToken(note, keySig, bar));
	return `${note.slurStart ? "(" : ""}${deco}${body}${note.slurEnd ? ")" : ""}`;
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

// One bar's tokens. An entirely-rested bar collapses to a whole-measure rest.
// Sub-quarter notes inside the same beat are beamed (no separating space);
// quarters, rests, and beat boundaries break the beam. Accidentals are local to
// the bar, so the persistence state starts fresh here.
function renderBar(
	notes: Note[],
	keySig: Record<string, number>,
	beat: number,
): string {
	if (notes.every((n) => n.rest))
		return abcDuration.fullBarRest(notes.reduce((s, n) => s + n.duration, 0));
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
