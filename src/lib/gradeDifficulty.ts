export type Grade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type AccidentalBreadth =
	| "none"
	| "rare"
	| "passing"
	| "occasional"
	| "regular"
	| "chromatic"
	| "frequent"
	| "modulation";

// §5 difficulty table, machine-usable. One place to tune.
// maxLeapScaleSteps follows generateMelody's unit (a 3rd = 2).
// shortestNoteSixteenths is the smallest rhythmic grid unit (quarter = 4,
// sixteenth = 1, thirty-second = 0.5).
export type GradeParams = {
	bars: [number, number]; // inclusive min/max
	timeSignatures: string[];
	maxKeyAccidentals: number; // sharps-or-flats in the written key
	shortestNoteSixteenths: number;
	maxLeapScaleSteps: number;
	tempoBpm: [number, number]; // inclusive min/max
	dynamics: string[];
	articulations: string[];
	accidentals: AccidentalBreadth;
	restProbability: number; // 0..1; flat 0.1 across grades — rests aren't a difficulty axis
	// Multiplies the draw weight of cells containing a 32nd: < 1 makes them rarer,
	// > 1 more frequent. Omitted = 1 (drawn like any other cell).
	fineNoteWeight?: number;
	// Multiplies the draw weight of coarse cells (no note shorter than a quarter):
	// < 1 makes whole/half/quarter-only bars rarer, so a grade reads more uniformly
	// busy. Omitted = 1.
	coarseNoteWeight?: number;
};

export const gradeDifficulty: Record<Grade, GradeParams> = {
	1: {
		bars: [4, 8],
		timeSignatures: ["4/4", "3/4"],
		maxKeyAccidentals: 1,
		shortestNoteSixteenths: 4,
		maxLeapScaleSteps: 2,
		tempoBpm: [60, 80],
		dynamics: ["f", "p"],
		articulations: [],
		accidentals: "none",
		restProbability: 0.1,
	},
	2: {
		bars: [8, 8],
		timeSignatures: ["4/4", "3/4", "2/4"],
		maxKeyAccidentals: 2,
		shortestNoteSixteenths: 2,
		maxLeapScaleSteps: 3,
		tempoBpm: [70, 90],
		dynamics: ["p", "mp", "mf", "f"],
		articulations: ["slur"],
		accidentals: "rare",
		restProbability: 0.1,
	},
	3: {
		bars: [8, 12],
		timeSignatures: ["4/4", "3/4", "2/4", "6/8"],
		maxKeyAccidentals: 3,
		shortestNoteSixteenths: 2,
		maxLeapScaleSteps: 4,
		tempoBpm: [80, 100],
		dynamics: ["p", "mp", "mf", "f", "cresc", "dim"],
		articulations: ["slur", "staccato"],
		accidentals: "passing",
		restProbability: 0.1,
	},
	4: {
		bars: [12, 12],
		timeSignatures: ["4/4", "3/4", "2/4", "6/8", "3/8"],
		maxKeyAccidentals: 4,
		shortestNoteSixteenths: 2,
		maxLeapScaleSteps: 5,
		tempoBpm: [80, 108],
		dynamics: ["p", "mp", "mf", "f", "cresc", "dim"],
		articulations: ["slur", "staccato", "accent", "tenuto"],
		accidentals: "occasional",
		restProbability: 0.1,
	},
	5: {
		bars: [12, 16],
		timeSignatures: ["4/4", "3/4", "2/4", "6/8", "3/8", "2/2", "9/8"],
		maxKeyAccidentals: 5,
		shortestNoteSixteenths: 1,
		maxLeapScaleSteps: 7,
		tempoBpm: [90, 120],
		dynamics: ["pp", "p", "mp", "mf", "f", "ff", "cresc", "dim"],
		articulations: ["slur", "staccato", "accent", "tenuto"],
		accidentals: "regular",
		restProbability: 0.1,
	},
	6: {
		bars: [16, 16],
		timeSignatures: [
			"4/4",
			"3/4",
			"2/4",
			"6/8",
			"3/8",
			"2/2",
			"9/8",
			"12/8",
			"5/4",
		],
		maxKeyAccidentals: 6,
		shortestNoteSixteenths: 0.5,
		maxLeapScaleSteps: 8,
		tempoBpm: [100, 132],
		dynamics: ["pp", "p", "mp", "mf", "f", "ff", "cresc", "dim"],
		articulations: ["slur", "staccato", "accent", "tenuto"],
		accidentals: "chromatic",
		restProbability: 0.1,
		fineNoteWeight: 0.1,
		coarseNoteWeight: 0.7,
	},
	7: {
		bars: [16, 20],
		timeSignatures: [
			"4/4",
			"3/4",
			"2/4",
			"6/8",
			"3/8",
			"2/2",
			"9/8",
			"12/8",
			"5/4",
			"7/8",
		],
		maxKeyAccidentals: 7,
		shortestNoteSixteenths: 0.5,
		maxLeapScaleSteps: 9,
		tempoBpm: [100, 144],
		dynamics: ["pp", "p", "mp", "mf", "f", "ff", "cresc", "dim"],
		articulations: ["slur", "staccato", "accent", "tenuto"],
		accidentals: "frequent",
		restProbability: 0.1,
		fineNoteWeight: 0.2,
		coarseNoteWeight: 0.5,
	},
	8: {
		bars: [20, 24],
		timeSignatures: [
			"4/4",
			"3/4",
			"2/4",
			"6/8",
			"3/8",
			"2/2",
			"9/8",
			"12/8",
			"5/4",
			"7/8",
			"5/8",
		],
		maxKeyAccidentals: 7,
		shortestNoteSixteenths: 0.5,
		maxLeapScaleSteps: 10,
		tempoBpm: [100, 144],
		dynamics: ["pp", "p", "mp", "mf", "f", "ff", "cresc", "dim"],
		articulations: ["slur", "staccato", "accent", "tenuto"],
		accidentals: "modulation",
		restProbability: 0.1,
		fineNoteWeight: 0.35,
		coarseNoteWeight: 0.3,
	},
};
