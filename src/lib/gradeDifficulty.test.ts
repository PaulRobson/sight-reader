import { describe, expect, it } from "vitest";
import { gradeDifficulty } from "./gradeDifficulty.ts";

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const ACC_ORDER = [
	"none",
	"rare",
	"passing",
	"occasional",
	"regular",
	"chromatic",
	"frequent",
	"modulation",
];

const params = GRADES.map((g) => gradeDifficulty[g]);
const pairs = params.slice(1).map((p, i) => [params[i], p] as const);

describe("gradeDifficulty table", () => {
	it("defines all eight grades", () => {
		expect(
			Object.keys(gradeDifficulty)
				.map(Number)
				.sort((a, b) => a - b),
		).toEqual([...GRADES]);
	});

	it("keeps every key signature within 7 accidentals", () => {
		for (const p of params)
			expect(p.maxKeyAccidentals).toBeGreaterThanOrEqual(0);
		for (const p of params) expect(p.maxKeyAccidentals).toBeLessThanOrEqual(7);
	});

	it("has valid bar and tempo ranges", () => {
		for (const p of params) {
			expect(p.bars[0]).toBeLessThanOrEqual(p.bars[1]);
			expect(p.tempoBpm[0]).toBeLessThanOrEqual(p.tempoBpm[1]);
			expect(p.restProbability).toBeGreaterThanOrEqual(0);
			expect(p.restProbability).toBeLessThanOrEqual(1);
		}
	});

	it("grows non-decreasingly in the difficulty-increasing metrics", () => {
		for (const [a, b] of pairs) {
			expect(b.maxKeyAccidentals).toBeGreaterThanOrEqual(a.maxKeyAccidentals);
			expect(b.maxLeapScaleSteps).toBeGreaterThanOrEqual(a.maxLeapScaleSteps);
			expect(b.restProbability).toBeGreaterThanOrEqual(a.restProbability);
			expect(b.bars[0]).toBeGreaterThanOrEqual(a.bars[0]);
			expect(b.bars[1]).toBeGreaterThanOrEqual(a.bars[1]);
			expect(b.tempoBpm[1]).toBeGreaterThanOrEqual(a.tempoBpm[1]);
			expect(b.dynamics.length).toBeGreaterThanOrEqual(a.dynamics.length);
			expect(b.articulations.length).toBeGreaterThanOrEqual(
				a.articulations.length,
			);
			expect(ACC_ORDER.indexOf(b.accidentals)).toBeGreaterThanOrEqual(
				ACC_ORDER.indexOf(a.accidentals),
			);
		}
	});

	it("shortens the shortest note monotonically (smaller = harder)", () => {
		for (const [a, b] of pairs)
			expect(b.shortestNoteSixteenths).toBeLessThanOrEqual(
				a.shortestNoteSixteenths,
			);
	});

	it("expands the time-signature set as a superset of the easier grade", () => {
		for (const [a, b] of pairs)
			for (const ts of a.timeSignatures) expect(b.timeSignatures).toContain(ts);
	});

	it("matches §5 anchors at grades 1, 5 and 8", () => {
		expect(gradeDifficulty[1]).toMatchObject({
			bars: [4, 8],
			maxLeapScaleSteps: 2,
			tempoBpm: [60, 80],
			dynamics: ["f", "p"],
			articulations: [],
			accidentals: "none",
		});
		expect(gradeDifficulty[5].timeSignatures).toContain("9/8");
		expect(gradeDifficulty[5].shortestNoteSixteenths).toBe(1);
		expect(gradeDifficulty[8].bars[0]).toBeGreaterThanOrEqual(20);
	});
});
