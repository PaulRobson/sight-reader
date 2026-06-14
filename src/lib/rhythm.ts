import type { Prng } from "./mulberry32.ts";

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

const BAR_4_4 = 16;

// Cells progress from longest notes to finest figures; `rhythm.restrict` drops
// the finer ones (16ths = duration 1, dotted-eighth/sixteenth = 3+1) for grades
// whose shortest note is coarser, so the rhythmic vocabulary grows with grade.
// quarter = 4, eighth = 2, sixteenth = 1, dotted-quarter = 6, dotted-eighth = 3.
const cells4x4: RhythmCell[] = [
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
];

const cells3x8: RhythmCell[] = [
	{ durations: [6], weight: 2 },
	{ durations: [4, 2], weight: 2 },
	{ durations: [2, 4], weight: 2 },
	{ durations: [2, 2, 2], weight: 2 },
	{ durations: [3, 1, 2], weight: 2 }, // dotted-eighth + sixteenth
	{ durations: [1, 1, 1, 1, 2], weight: 1 }, // sixteenths
];

const cells9x8: RhythmCell[] = [
	{ durations: [18], weight: 1 },
	{ durations: [6, 6, 6], weight: 3 },
	{ durations: [6, 6, 4, 2], weight: 1 },
	{ durations: [4, 2, 6, 6], weight: 1 },
	{ durations: [6, 4, 2, 6], weight: 1 },
	{ durations: [3, 1, 2, 6, 6], weight: 1 }, // dotted-eighth + sixteenth
];

const cells12x8: RhythmCell[] = [
	{ durations: [24], weight: 1 },
	{ durations: [12, 12], weight: 2 },
	{ durations: [6, 6, 6, 6], weight: 3 },
	{ durations: [12, 6, 6], weight: 1 },
	{ durations: [6, 6, 12], weight: 1 },
	{ durations: [6, 6, 6, 3, 1, 2], weight: 1 }, // dotted-eighth + sixteenth
];

const cells5x4: RhythmCell[] = [
	{ durations: [20], weight: 1 },
	{ durations: [8, 8, 4], weight: 2 },
	{ durations: [4, 8, 8], weight: 2 },
	{ durations: [8, 4, 4, 4], weight: 1 },
	{ durations: [4, 4, 4, 4, 4], weight: 2 },
	{ durations: [4, 4, 4, 2, 2, 4], weight: 1 }, // eighths
	{ durations: [3, 1, 4, 4, 4, 4], weight: 1 }, // dotted-eighth + sixteenth
];

const cells7x8: RhythmCell[] = [
	{ durations: [14], weight: 1 },
	{ durations: [6, 4, 4], weight: 2 },
	{ durations: [4, 6, 4], weight: 2 },
	{ durations: [4, 4, 6], weight: 2 },
	{ durations: [2, 2, 2, 2, 2, 2, 2], weight: 1 },
	{ durations: [3, 1, 4, 2, 2, 2], weight: 1 }, // dotted-eighth + sixteenth
];

const cells5x8: RhythmCell[] = [
	{ durations: [10], weight: 1 },
	{ durations: [6, 4], weight: 2 },
	{ durations: [4, 6], weight: 2 },
	{ durations: [4, 2, 2, 2], weight: 1 },
	{ durations: [2, 2, 2, 4], weight: 1 },
	{ durations: [3, 1, 2, 2, 2], weight: 1 }, // dotted-eighth + sixteenth
];

// §5 time signatures. Cut time (2/2) shares 4/4's 16-unit groupings.
const METERS: Record<string, Meter> = {
	"4/4": { timeSignature: "4/4", barUnits: 16, cells: cells4x4 },
	"3/4": { timeSignature: "3/4", barUnits: 12, cells: cells3x4 },
	"2/4": { timeSignature: "2/4", barUnits: 8, cells: cells2x4 },
	"6/8": { timeSignature: "6/8", barUnits: 12, cells: cells6x8 },
	"3/8": { timeSignature: "3/8", barUnits: 6, cells: cells3x8 },
	"2/2": { timeSignature: "2/2", barUnits: 16, cells: cells4x4 },
	"9/8": { timeSignature: "9/8", barUnits: 18, cells: cells9x8 },
	"12/8": { timeSignature: "12/8", barUnits: 24, cells: cells12x8 },
	"5/4": { timeSignature: "5/4", barUnits: 20, cells: cells5x4 },
	"7/8": { timeSignature: "7/8", barUnits: 14, cells: cells7x8 },
	"5/8": { timeSignature: "5/8", barUnits: 10, cells: cells5x8 },
};

export const rhythm = {
	barUnits4x4: BAR_4_4,
	cells4x4,
	meters: METERS,
	draw(cells: RhythmCell[], rng: Prng): RhythmCell {
		const total = cells.reduce((sum, c) => sum + c.weight, 0);
		let r = rng() * total;
		for (const cell of cells) {
			r -= cell.weight;
			if (r < 0) return cell;
		}
		return cells[cells.length - 1];
	},
	// One drawn cell per bar, flattened to a duration stream.
	drawBars(meter: Meter, bars: number, rng: Prng): number[] {
		const durations: number[] = [];
		for (let b = 0; b < bars; b++)
			durations.push(...rhythm.draw(meter.cells, rng).durations);
		return durations;
	},
	// Drop cells finer than the grade's shortest note; the whole-bar cell always
	// survives (its min duration is barUnits), so the result is never empty.
	restrict(meter: Meter, shortestNote: number): Meter {
		const cells = meter.cells.filter(
			(c) => Math.min(...c.durations) >= shortestNote,
		);
		return {
			...meter,
			cells: cells.length
				? cells
				: [{ durations: [meter.barUnits], weight: 1 }],
		};
	},
};
