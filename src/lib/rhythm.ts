import {
	BAR_4_4,
	cells4x4,
	type Meter,
	meters,
	type RhythmCell,
} from "./meters.ts";
import type { Prng } from "./mulberry32.ts";

export type { Meter, RhythmCell } from "./meters.ts";

export const rhythm = {
	barUnits4x4: BAR_4_4,
	cells4x4,
	meters,
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
