import type { Prng } from "./mulberry32.ts";

// Durations in sixteenth-note units: quarter = 4, half = 8, whole = 16.
// A 4/4 bar = 16 units. Each cell's durations sum to the bar length.
export type RhythmCell = {
	durations: number[];
	weight: number;
};

const BAR_4_4 = 16;

export const rhythm = {
	barUnits4x4: BAR_4_4,
	// Grade-1 appropriate: quarter is the shortest note, longer notes favoured.
	cells4x4: [
		{ durations: [16], weight: 1 },
		{ durations: [8, 8], weight: 2 },
		{ durations: [4, 4, 8], weight: 2 },
		{ durations: [8, 4, 4], weight: 2 },
		{ durations: [4, 4, 4, 4], weight: 3 },
		{ durations: [12, 4], weight: 1 },
	] as RhythmCell[],
	draw(cells: RhythmCell[], rng: Prng): RhythmCell {
		const total = cells.reduce((sum, c) => sum + c.weight, 0);
		let r = rng() * total;
		for (const cell of cells) {
			r -= cell.weight;
			if (r < 0) return cell;
		}
		return cells[cells.length - 1];
	},
	// One drawn 4/4 cell per bar, flattened to a duration stream.
	drawBars(bars: number, rng: Prng): number[] {
		const durations: number[] = [];
		for (let b = 0; b < bars; b++)
			durations.push(...rhythm.draw(rhythm.cells4x4, rng).durations);
		return durations;
	},
};
