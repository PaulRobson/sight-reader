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

export const scale = {
	major(tonic: string): ScaleNote[] {
		const root = parseTonic(tonic);
		const rootIndex = LETTERS.indexOf(root.letter);
		return MAJOR_STEPS.map((step, i) => {
			const letter = LETTERS[(rootIndex + i) % 7];
			const pitchClass = (root.pitchClass + step) % 12;
			return {
				letter,
				accidental: normalizeAccidental(pitchClass - LETTER_PC[letter]),
				pitchClass,
			};
		});
	},
	chordTones(notes: ScaleNote[]): ScaleNote[] {
		return [notes[0], notes[2], notes[4]];
	},
};
