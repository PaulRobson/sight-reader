export type Clef = "treble" | "bass" | "alto" | "tenor";

// §2 / §6. Ranges are WRITTEN pitch in scientific pitch notation.
// soundingOffsetSemitones is applied only at playback (§6), never to the score.
export type InstrumentDef = {
	id: string;
	name: string;
	defaultClef: Clef;
	clefs: Clef[];
	soundingOffsetSemitones: number;
	gmProgram: number;
	lowestWrittenNote: string;
	highestWrittenNote: string;
	keyDifficultyOverride?: string[];
};

export const instruments: InstrumentDef[] = [
	{
		id: "trombone",
		name: "Trombone",
		defaultClef: "bass",
		clefs: ["bass", "tenor"],
		soundingOffsetSemitones: 0,
		gmProgram: 57,
		lowestWrittenNote: "E2",
		highestWrittenNote: "Bb4",
	},
	{
		id: "cello",
		name: "Cello",
		defaultClef: "bass",
		clefs: ["bass", "tenor"],
		soundingOffsetSemitones: 0,
		gmProgram: 42,
		lowestWrittenNote: "C2",
		highestWrittenNote: "A5",
	},
	{
		id: "piano",
		name: "Piano",
		defaultClef: "treble",
		clefs: ["treble", "bass"],
		soundingOffsetSemitones: 0,
		gmProgram: 0,
		lowestWrittenNote: "A0",
		highestWrittenNote: "C8",
	},
	{
		id: "flute",
		name: "Flute",
		defaultClef: "treble",
		clefs: ["treble"],
		soundingOffsetSemitones: 0,
		gmProgram: 73,
		lowestWrittenNote: "C4",
		highestWrittenNote: "D7",
	},
	{
		id: "violin",
		name: "Violin",
		defaultClef: "treble",
		clefs: ["treble"],
		soundingOffsetSemitones: 0,
		gmProgram: 40,
		lowestWrittenNote: "G3",
		highestWrittenNote: "A7",
	},
	{
		id: "bflat-clarinet",
		name: "Clarinet in B♭",
		defaultClef: "treble",
		clefs: ["treble"],
		soundingOffsetSemitones: -2,
		gmProgram: 71,
		lowestWrittenNote: "E3",
		highestWrittenNote: "C6",
	},
	{
		id: "bflat-trumpet",
		name: "Trumpet in B♭",
		defaultClef: "treble",
		clefs: ["treble"],
		soundingOffsetSemitones: -2,
		gmProgram: 56,
		lowestWrittenNote: "F#3",
		highestWrittenNote: "C6",
	},
	{
		id: "alto-sax",
		name: "Alto Sax (E♭)",
		defaultClef: "treble",
		clefs: ["treble"],
		soundingOffsetSemitones: -9,
		gmProgram: 65,
		lowestWrittenNote: "Bb3",
		highestWrittenNote: "F6",
	},
	{
		id: "guitar",
		name: "Guitar",
		defaultClef: "treble",
		clefs: ["treble"],
		soundingOffsetSemitones: -12,
		gmProgram: 24,
		lowestWrittenNote: "E3",
		highestWrittenNote: "E6",
	},
];

const PITCH_CLASS: Record<string, number> = {
	C: 0,
	D: 2,
	E: 4,
	F: 5,
	G: 7,
	A: 9,
	B: 11,
};

// Scientific pitch notation (e.g. "F#3", "Bb4", "C8") to MIDI; C4 = 60. The
// instrument table is the only caller, so malformed input is a programmer error.
export function spnToMidi(spn: string): number {
	const m = /^([A-G])(#+|b+)?(-?\d)$/.exec(spn);
	if (!m) throw new Error(`invalid scientific pitch notation: ${spn}`);
	const [, letter, acc, octave] = m;
	const alter = acc ? (acc[0] === "#" ? acc.length : -acc.length) : 0;
	return 12 * (Number(octave) + 1) + PITCH_CLASS[letter] + alter;
}

export function findInstrument(id: string): InstrumentDef {
	return instruments.find((i) => i.id === id) ?? instruments[0];
}

// Keep a stored clef only if the instrument supports it; otherwise its default.
export function constrainClef(instrument: InstrumentDef, clef: Clef): Clef {
	return instrument.clefs.includes(clef) ? clef : instrument.defaultClef;
}

// Treble + bass together = grand staff (piano), shown as one staff pair.
export function isGrandStaff(instrument: InstrumentDef): boolean {
	return (
		instrument.clefs.includes("treble") && instrument.clefs.includes("bass")
	);
}
