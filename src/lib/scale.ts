type Letter = "C" | "D" | "E" | "F" | "G" | "A" | "B";

export type ScaleNote = {
	letter: Letter;
	accidental: number; // semitone alteration: -1 flat, 0 natural, +1 sharp
	pitchClass: number; // 0..11, C = 0
};

const LETTER_PC: Record<Letter, number> = {
	C: 0,
	D: 2,
	E: 4,
	F: 5,
	G: 7,
	A: 9,
	B: 11,
};
const LETTERS: Letter[] = ["C", "D", "E", "F", "G", "A", "B"];
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
const NATURAL_MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10];

// Minor keys carry a trailing "m" (abc-style: "Am", "F#m"); the tonic is the
// rest of the string. The natural-minor spelling yields the relative-major
// signature, so it slots into the same key-signature tiers (see keys.ts).
function isMinor(key: string): boolean {
	return key.endsWith("m");
}

function parseTonic(spec: string): ScaleNote {
	const letter = spec[0].toUpperCase() as Letter;
	let accidental = 0;
	for (const ch of spec.slice(1)) {
		if (ch === "#") accidental += 1;
		else if (ch === "b") accidental -= 1;
	}
	const pitchClass = (((LETTER_PC[letter] + accidental) % 12) + 12) % 12;
	return { letter, accidental, pitchClass };
}

// Smallest signed alteration (e.g. B# resolves to +1, not -11).
function normalizeAccidental(delta: number): number {
	const d = ((delta % 12) + 12) % 12;
	return d > 6 ? d - 12 : d;
}

function buildScale(tonic: string, steps: number[]): ScaleNote[] {
	const root = parseTonic(tonic);
	const rootIndex = LETTERS.indexOf(root.letter);
	return steps.map((step, i) => {
		const letter = LETTERS[(rootIndex + i) % 7];
		const pitchClass = (root.pitchClass + step) % 12;
		return {
			letter,
			accidental: normalizeAccidental(pitchClass - LETTER_PC[letter]),
			pitchClass,
		};
	});
}

export const scale = {
	major(tonic: string): ScaleNote[] {
		return buildScale(tonic, MAJOR_STEPS);
	},
	minor(tonic: string): ScaleNote[] {
		return buildScale(tonic, NATURAL_MINOR_STEPS);
	},
	// Degrees for a key string, major unless it ends in "m" (natural minor).
	degrees(key: string): ScaleNote[] {
		return isMinor(key) ? scale.minor(key.slice(0, -1)) : scale.major(key);
	},
	chordTones(notes: ScaleNote[]): ScaleNote[] {
		return [notes[0], notes[2], notes[4]];
	},
	// SPN octave (C4 = middle C = MIDI 60). Octave follows the letter, so Cb4
	// and B#3 stay correctly labelled.
	toMidi(note: ScaleNote, octave: number): number {
		return 12 * (octave + 1) + LETTER_PC[note.letter] + note.accidental;
	},
};
