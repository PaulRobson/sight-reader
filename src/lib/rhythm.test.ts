import { describe, expect, it } from "vitest";
import { gradeDifficulty } from "./gradeDifficulty.ts";
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

describe("rhythm.meters", () => {
	it("covers every time signature in the grade table", () => {
		const used = new Set(
			Object.values(gradeDifficulty).flatMap((p) => p.timeSignatures),
		);
		for (const ts of used) expect(rhythm.meters[ts]).toBeDefined();
	});

	it("has every cell sum to its meter's barUnits with a positive weight", () => {
		for (const meter of Object.values(rhythm.meters)) {
			for (const cell of meter.cells) {
				const sum = cell.durations.reduce((a, b) => a + b, 0);
				expect(sum).toBe(meter.barUnits);
				expect(cell.weight).toBeGreaterThan(0);
			}
		}
	});
});

describe("rhythm grade ramp", () => {
	const has = (timeSig: string, duration: number) =>
		rhythm.meters[timeSig].cells.some((c) => c.durations.includes(duration));

	it("includes fine figures (sixteenths, dotted-eighths) in common meters", () => {
		for (const timeSig of ["4/4", "3/4", "2/4", "6/8"]) {
			expect(has(timeSig, 1), `${timeSig} sixteenth`).toBe(true);
			expect(has(timeSig, 3), `${timeSig} dotted-eighth`).toBe(true);
		}
	});

	it("gates fine figures by the grade's shortest note", () => {
		const finest = (m: { cells: RhythmCell[] }) =>
			Math.min(...m.cells.flatMap((c) => c.durations));
		expect(finest(rhythm.restrict(rhythm.meters["4/4"], 4))).toBe(4); // quarter+
		expect(finest(rhythm.restrict(rhythm.meters["4/4"], 2))).toBe(2); // eighths
		expect(finest(rhythm.restrict(rhythm.meters["4/4"], 1))).toBe(1); // sixteenths
		expect(finest(rhythm.restrict(rhythm.meters["4/4"], 0.5))).toBe(0.5); // 32nds
	});

	it("unlocks thirty-seconds only at the 0.5 shortest note, not at the 16th grid", () => {
		const has32nd = (shortest: number) =>
			rhythm
				.restrict(rhythm.meters["4/4"], shortest)
				.cells.some((c) => c.durations.includes(0.5));
		expect(has32nd(1)).toBe(false); // grades 5-6 (sixteenth grid) get no 32nds
		expect(has32nd(0.5)).toBe(true); // grades 7-8 do
	});
});

describe("rhythm.drawBars", () => {
	it("fills each bar to the meter's length", () => {
		const meter = rhythm.meters["6/8"];
		const durations = rhythm.drawBars(meter, 5, mulberry32(2));
		expect(durations.reduce((a, b) => a + b, 0)).toBe(5 * meter.barUnits);
	});
});

describe("rhythm.restrict", () => {
	it("drops cells finer than the shortest note", () => {
		const meter = rhythm.restrict(rhythm.meters["3/4"], 4);
		for (const cell of meter.cells)
			expect(Math.min(...cell.durations)).toBeGreaterThanOrEqual(4);
	});

	it("keeps the whole-bar cell when everything else is too fine", () => {
		const meter = rhythm.restrict(rhythm.meters["6/8"], 999);
		expect(meter.cells).toHaveLength(1);
		expect(meter.cells[0].durations).toEqual([12]);
	});

	it("preserves barUnits and timeSignature", () => {
		const meter = rhythm.restrict(rhythm.meters["5/4"], 4);
		expect(meter.barUnits).toBe(20);
		expect(meter.timeSignature).toBe("5/4");
	});
});
