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

// Default accidental each letter carries from the key signature (natural minor
// for a minor key, matching the signature abcjs draws for K:Am etc.).
function keySignature(key: string): Record<string, number> {
	const sig: Record<string, number> = {};
	for (const d of scale.degrees(key)) sig[d.letter] = d.accidental;
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

// A pitched note (rests are merged and rendered by renderBar). L:1/16, so the
// duration is its abc length multiplier; slurs wrap it in parens, decorations
// prefix it.
function noteToken(
	note: Note,
	keySig: Record<string, number>,
	bar: Record<string, number>,
): string {
	const deco = decorations(note);
	const body = pitchToken(note, accidentalToken(note, keySig, bar));
	return `${note.slurStart ? "(" : ""}${deco}${body}${note.slurEnd ? ")" : ""}`;
}

// Combine consecutive rests into one rest each, so the bar lays them out as
// merged rest values (a half rest, say) rather than one token per slot.
function mergeRests(notes: Note[]): Note[] {
	const out: Note[] = [];
	for (const n of notes) {
		const prev = out[out.length - 1];
		if (n.rest && prev?.rest) prev.duration += n.duration;
		else out.push({ ...n });
	}
	return out;
}

// One bar's tokens. An entirely-rested bar collapses to a whole-measure rest;
// other rest runs merge to the fewest values the metre allows. Sub-quarter notes
// inside the same beat are beamed (no separating space); quarters, rests, and
// beat boundaries break the beam. Accidentals are local to the bar.
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
	for (const note of mergeRests(notes)) {
		const token = note.rest
			? abcDuration.restRun(pos, note.duration, beat)
			: noteToken(note, keySig, bar);
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
	const beat = abcDuration.beatUnits(meter);
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
