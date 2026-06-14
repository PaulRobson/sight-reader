import type { Melody, Note } from "./generateMelody.ts";

export type SerializeOptions = {
	title?: string;
	tempo?: number; // BPM for the quarter note (Q:1/4=...)
	program?: number; // General MIDI program
	clef?: string; // "treble" | "bass" | "alto" | "tenor"
};

const DEFAULTS = { title: "Exercise", tempo: 70, program: 0, clef: "treble" };

function pitchLetters(note: Note): string {
	return note.octave >= 5
		? `${note.letter.toLowerCase()}${"'".repeat(note.octave - 5)}`
		: `${note.letter.toUpperCase()}${",".repeat(Math.max(0, 4 - note.octave))}`;
}

// L:1/16, so a slot's duration in sixteenth units is its abc length multiplier;
// rests use `z`.
function noteToken(note: Note): string {
	const base = note.rest ? "z" : pitchLetters(note);
	return note.duration === 1 ? base : `${base}${note.duration}`;
}

function noteStream(melody: Melody): string {
	const parts: string[] = [];
	let acc = 0;
	for (const note of melody.notes) {
		parts.push(noteToken(note));
		acc += note.duration;
		if (acc % melody.barUnits === 0) parts.push("|");
	}
	return parts.join(" ");
}

// Written pitch only; transposition is applied at synth time, never here.
// Meter is fixed at 4/4 for the thin path (the only time signature the
// generator emits so far); richer meters arrive with Slice 4.
export function toAbc(melody: Melody, options: SerializeOptions = {}): string {
	const { title, tempo, program, clef } = { ...DEFAULTS, ...options };
	return [
		"X:1",
		`T:${title}`,
		"M:4/4",
		"L:1/16",
		`Q:1/4=${tempo}`,
		`K:${melody.key} clef=${clef}`,
		`%%MIDI program ${program}`,
		noteStream(melody),
	].join("\n");
}
