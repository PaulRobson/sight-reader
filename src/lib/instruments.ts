export type Clef = "treble" | "bass" | "alto" | "tenor";

// §2 / §6. Ranges are WRITTEN pitch in scientific pitch notation.
// soundingOffsetSemitones is applied only at playback (§6), never to the score.
type InstrumentDef = {
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
