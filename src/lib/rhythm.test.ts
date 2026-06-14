import { describe, expect, it } from "vitest";
import { mulberry32 } from "./mulberry32.ts";
import { type RhythmCell, rhythm } from "./rhythm.ts";

describe("rhythm.cells4x4", () => {
	it("every cell sums to one 4/4 bar", () => {
		for (const cell of rhythm.cells4x4) {
			const sum = cell.durations.reduce((a, b) => a + b, 0);
			expect(sum).toBe(rhythm.barUnits4x4);
		}
	});

	it("has positive weights", () => {
		expect(rhythm.cells4x4.every((c) => c.weight > 0)).toBe(true);
	});
});

describe("rhythm.draw", () => {
	it("is deterministic for the same seed", () => {
		const draw = (seed: number) => {
			const rng = mulberry32(seed);
			return Array.from({ length: 12 }, () =>
				rhythm.draw(rhythm.cells4x4, rng),
			);
		};
		expect(draw(99)).toEqual(draw(99));
	});

	it("diverges for different seeds", () => {
		const seqFor = (seed: number) => {
			const rng = mulberry32(seed);
			return Array.from({ length: 12 }, () =>
				rhythm.cells4x4.indexOf(rhythm.draw(rhythm.cells4x4, rng)),
			).join();
		};
		expect(seqFor(1)).not.toBe(seqFor(2));
	});

	it("only returns cells from the supplied library", () => {
		const rng = mulberry32(7);
		for (let i = 0; i < 200; i++) {
			expect(rhythm.cells4x4).toContain(rhythm.draw(rhythm.cells4x4, rng));
		}
	});

	it("never selects a zero-weight cell", () => {
		const cells: RhythmCell[] = [
			{ durations: [16], weight: 0 },
			{ durations: [8, 8], weight: 1 },
		];
		const rng = mulberry32(123);
		for (let i = 0; i < 200; i++) {
			expect(rhythm.draw(cells, rng).weight).toBe(1);
		}
	});
});
