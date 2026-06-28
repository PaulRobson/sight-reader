import type { Melody } from "./generateMelody.ts";
import { noteStream } from "./noteStream.ts";
import { splitGrandStaff } from "./splitGrandStaff.ts";

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

// Written pitch only; transposition is applied at synth time, never here.
// L:1/16 is the default note length for every meter, so durations stay integer
// length multipliers; bar lines and beaming come from noteStream.
export function toAbc(melody: Melody, options: SerializeOptions = {}): string {
	const { title, tempo, program, clef, meter, grandStaff } = {
		...DEFAULTS,
		...options,
	};
	const head = ["X:1", `T:${title}`, `M:${meter}`, "L:1/16", `Q:1/4=${tempo}`];
	const stream = (notes: Melody["notes"]) =>
		noteStream(melody.key, melody.barUnits, notes, meter);
	if (grandStaff) {
		const { treble, bass } = splitGrandStaff(melody.notes);
		return [
			...head,
			`K:${melody.key}`,
			`%%MIDI program ${program}`,
			"%%score {1 2}",
			"V:1 clef=treble",
			"V:2 clef=bass",
			`[V:1] ${stream(treble)}`,
			`[V:2] ${stream(bass)}`,
		].join("\n");
	}
	return [
		...head,
		`K:${melody.key} clef=${clef}`,
		`%%MIDI program ${program}`,
		stream(melody.notes),
	].join("\n");
}
