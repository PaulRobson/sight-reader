import type { Note } from "./generateMelody.ts";

const MIDDLE_C = 60;

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
		slurStart: undefined,
		slurEnd: undefined,
	});
	return {
		treble: notes.map((n) => (!n.rest && n.midi >= MIDDLE_C ? n : rest(n))),
		bass: notes.map((n) => (!n.rest && n.midi < MIDDLE_C ? n : rest(n))),
	};
}
