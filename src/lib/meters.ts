// Durations in sixteenth-note units: quarter = 4, half = 8, whole = 16.
// Each cell's durations sum to its meter's bar length (`barUnits`).
export type RhythmCell = {
	durations: number[];
	weight: number;
};

export type Meter = {
	timeSignature: string;
	barUnits: number; // sixteenth units per bar
	cells: RhythmCell[];
};

export const BAR_4_4 = 16;

// Cells progress from longest notes to finest figures; `rhythm.restrict` drops
// the finer ones (16ths = duration 1, 32nds = 0.5) for grades whose shortest note
// is coarser, so the rhythmic vocabulary grows with grade. quarter = 4, eighth =
// 2, sixteenth = 1, thirty-second = 0.5, dotted-quarter = 6, dotted-eighth = 3.
export const cells4x4: RhythmCell[] = [
	{ durations: [16], weight: 1 },
	{ durations: [8, 8], weight: 2 },
	{ durations: [4, 4, 8], weight: 2 },
	{ durations: [8, 4, 4], weight: 2 },
	{ durations: [4, 4, 4, 4], weight: 3 },
	{ durations: [12, 4], weight: 1 },
	{ durations: [4, 8, 4], weight: 2 }, // syncopated half on beat 2
	{ durations: [4, 4, 2, 2, 4], weight: 2 }, // eighths
	{ durations: [2, 2, 4, 4, 4], weight: 2 },
	{ durations: [4, 2, 2, 4, 4], weight: 2 },
	{ durations: [2, 2, 2, 2, 4, 4], weight: 2 },
	{ durations: [2, 4, 4, 4, 2], weight: 2 }, // syncopation
	{ durations: [6, 2, 4, 4], weight: 2 }, // dotted quarter + eighth
	{ durations: [6, 2, 6, 2], weight: 1 },
	{ durations: [3, 1, 4, 4, 4], weight: 2 }, // dotted-eighth + sixteenth
	{ durations: [1, 1, 1, 1, 4, 4, 4], weight: 2 }, // sixteenths
	{ durations: [2, 1, 1, 4, 4, 4], weight: 1 },
	{ durations: [1, 1, 1, 1, 1, 1, 1, 1, 4, 4], weight: 2 }, // two beats of sixteenths
	{ durations: [4, 4, 1, 1, 1, 1, 1, 1, 1, 1], weight: 2 }, // two beats of sixteenths
	{ durations: [1, 1, 1, 1, 4, 1, 1, 1, 1, 4], weight: 1 }, // sixteenth runs, beats 1 & 3
	{ durations: [0.5, 0.5, 1, 1, 1, 4, 4, 4], weight: 1 }, // thirty-seconds on beat 1
	{ durations: [4, 4, 0.5, 0.5, 1, 1, 1, 4], weight: 1 }, // thirty-seconds on beat 3
];

const cells3x4: RhythmCell[] = [
	{ durations: [12], weight: 1 },
	{ durations: [8, 4], weight: 2 },
	{ durations: [4, 8], weight: 2 },
	{ durations: [4, 4, 4], weight: 3 },
	{ durations: [4, 4, 2, 2], weight: 2 },
	{ durations: [2, 2, 4, 4], weight: 2 },
	{ durations: [4, 2, 2, 4], weight: 2 },
	{ durations: [2, 2, 2, 2, 4], weight: 2 },
	{ durations: [6, 2, 4], weight: 2 }, // dotted
	{ durations: [4, 6, 2], weight: 1 },
	{ durations: [2, 4, 4, 2], weight: 2 }, // syncopation
	{ durations: [3, 1, 4, 4], weight: 2 }, // dotted-eighth + sixteenth
	{ durations: [1, 1, 1, 1, 4, 4], weight: 1 }, // sixteenths
	{ durations: [1, 1, 1, 1, 1, 1, 1, 1, 4], weight: 1 }, // two beats of sixteenths
	{ durations: [0.5, 0.5, 1, 1, 1, 4, 4], weight: 1 }, // thirty-seconds
];

const cells2x4: RhythmCell[] = [
	{ durations: [8], weight: 1 },
	{ durations: [4, 4], weight: 3 },
	{ durations: [4, 2, 2], weight: 2 },
	{ durations: [2, 2, 4], weight: 2 },
	{ durations: [2, 2, 2, 2], weight: 2 },
	{ durations: [6, 2], weight: 2 }, // dotted
	{ durations: [2, 4, 2], weight: 2 }, // syncopation
	{ durations: [3, 1, 4], weight: 2 }, // dotted-eighth + sixteenth
	{ durations: [1, 1, 2, 4], weight: 1 }, // sixteenths
	{ durations: [2, 2, 1, 1, 2], weight: 1 },
	{ durations: [0.5, 0.5, 1, 1, 1, 4], weight: 1 }, // thirty-seconds
];

// Compound: beats are dotted quarters (6 units).
const cells6x8: RhythmCell[] = [
	{ durations: [12], weight: 1 },
	{ durations: [6, 6], weight: 3 },
	{ durations: [6, 4, 2], weight: 2 },
	{ durations: [4, 2, 6], weight: 2 },
	{ durations: [6, 2, 2, 2], weight: 1 },
	{ durations: [2, 2, 2, 6], weight: 1 },
	{ durations: [2, 2, 2, 2, 2, 2], weight: 1 },
	{ durations: [3, 1, 2, 6], weight: 2 }, // dotted-eighth + sixteenth
	{ durations: [1, 1, 1, 1, 2, 6], weight: 1 }, // sixteenths
	{ durations: [0.5, 0.5, 1, 2, 2, 6], weight: 1 }, // thirty-seconds on beat 1
];

const cells3x8: RhythmCell[] = [
	{ durations: [6], weight: 2 },
	{ durations: [4, 2], weight: 2 },
	{ durations: [2, 4], weight: 2 },
	{ durations: [2, 2, 2], weight: 2 },
	{ durations: [3, 1, 2], weight: 2 }, // dotted-eighth + sixteenth
	{ durations: [1, 1, 1, 1, 2], weight: 1 }, // sixteenths
	{ durations: [0.5, 0.5, 1, 1, 1, 2], weight: 1 }, // thirty-seconds
];

const cells9x8: RhythmCell[] = [
	{ durations: [18], weight: 1 },
	{ durations: [6, 6, 6], weight: 3 },
	{ durations: [6, 6, 4, 2], weight: 1 },
	{ durations: [4, 2, 6, 6], weight: 1 },
	{ durations: [6, 4, 2, 6], weight: 1 },
	{ durations: [3, 1, 2, 6, 6], weight: 1 }, // dotted-eighth + sixteenth
	{ durations: [0.5, 0.5, 1, 2, 2, 6, 6], weight: 1 }, // thirty-seconds on beat 1
];

const cells12x8: RhythmCell[] = [
	{ durations: [24], weight: 1 },
	{ durations: [12, 12], weight: 2 },
	{ durations: [6, 6, 6, 6], weight: 3 },
	{ durations: [12, 6, 6], weight: 1 },
	{ durations: [6, 6, 12], weight: 1 },
	{ durations: [6, 6, 6, 3, 1, 2], weight: 1 }, // dotted-eighth + sixteenth
	{ durations: [0.5, 0.5, 1, 2, 2, 6, 6, 6], weight: 1 }, // thirty-seconds on beat 1
];

const cells5x4: RhythmCell[] = [
	{ durations: [20], weight: 1 },
	{ durations: [8, 8, 4], weight: 2 },
	{ durations: [4, 8, 8], weight: 2 },
	{ durations: [8, 4, 4, 4], weight: 1 },
	{ durations: [4, 4, 4, 4, 4], weight: 2 },
	{ durations: [4, 4, 4, 2, 2, 4], weight: 1 }, // eighths
	{ durations: [3, 1, 4, 4, 4, 4], weight: 1 }, // dotted-eighth + sixteenth
	{ durations: [0.5, 0.5, 1, 1, 1, 4, 4, 4, 4], weight: 1 }, // thirty-seconds
];

const cells7x8: RhythmCell[] = [
	{ durations: [14], weight: 1 },
	{ durations: [6, 4, 4], weight: 2 },
	{ durations: [4, 6, 4], weight: 2 },
	{ durations: [4, 4, 6], weight: 2 },
	{ durations: [2, 2, 2, 2, 2, 2, 2], weight: 1 },
	{ durations: [3, 1, 4, 2, 2, 2], weight: 1 }, // dotted-eighth + sixteenth
	{ durations: [0.5, 0.5, 1, 2, 2, 2, 2, 2, 2], weight: 1 }, // thirty-seconds
];

const cells5x8: RhythmCell[] = [
	{ durations: [10], weight: 1 },
	{ durations: [6, 4], weight: 2 },
	{ durations: [4, 6], weight: 2 },
	{ durations: [4, 2, 2, 2], weight: 1 },
	{ durations: [2, 2, 2, 4], weight: 1 },
	{ durations: [3, 1, 2, 2, 2], weight: 1 }, // dotted-eighth + sixteenth
	{ durations: [0.5, 0.5, 1, 2, 2, 2, 2], weight: 1 }, // thirty-seconds
];

// Cut time (2/2) shares 4/4's 16-unit groupings but excludes 32nds: at a
// half-note pulse they would be unreadably fast.
const cells2x2 = cells4x4.filter((c) => Math.min(...c.durations) >= 1);

// §5 time signatures.
export const meters: Record<string, Meter> = {
	"4/4": { timeSignature: "4/4", barUnits: 16, cells: cells4x4 },
	"3/4": { timeSignature: "3/4", barUnits: 12, cells: cells3x4 },
	"2/4": { timeSignature: "2/4", barUnits: 8, cells: cells2x4 },
	"6/8": { timeSignature: "6/8", barUnits: 12, cells: cells6x8 },
	"3/8": { timeSignature: "3/8", barUnits: 6, cells: cells3x8 },
	"2/2": { timeSignature: "2/2", barUnits: 16, cells: cells2x2 },
	"9/8": { timeSignature: "9/8", barUnits: 18, cells: cells9x8 },
	"12/8": { timeSignature: "12/8", barUnits: 24, cells: cells12x8 },
	"5/4": { timeSignature: "5/4", barUnits: 20, cells: cells5x4 },
	"7/8": { timeSignature: "7/8", barUnits: 14, cells: cells7x8 },
	"5/8": { timeSignature: "5/8", barUnits: 10, cells: cells5x8 },
};
