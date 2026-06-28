import { describe, expect, it } from "vitest";
import { abcDuration } from "./abcDuration.ts";

const CLEAN = new Set([1, 2, 3, 4, 6, 7, 8, 12, 14, 15, 16]);

describe("abcDuration.split", () => {
	it("passes representable durations through unchanged", () => {
		for (const d of [1, 2, 3, 4, 6, 7, 8, 12, 14, 15, 16, 18, 20, 24])
			expect(abcDuration.split(d)).toEqual([d]);
	});

	it("splits non-representable durations into clean pieces summing to the original", () => {
		for (const d of [5, 9, 10, 11, 13]) {
			const pieces = abcDuration.split(d);
			expect(pieces.length).toBeGreaterThan(1);
			expect(pieces.reduce((s, p) => s + p, 0)).toBe(d);
			for (const p of pieces) expect(CLEAN.has(p)).toBe(true);
		}
	});

	it("splits a 5/8 whole bar into a half tied to an eighth", () => {
		expect(abcDuration.split(10)).toEqual([8, 2]);
	});
});

describe("abcDuration.fullBarRest", () => {
	it("emits a single measure-filling rest (abcjs centres it as a whole rest)", () => {
		for (const total of [16, 12, 8, 6, 18, 20, 24, 14])
			expect(abcDuration.fullBarRest(total)).toBe(`z${total}`);
	});

	it("never uses Z, whose multi-measure count clutters empty grand-staff bars", () => {
		for (const total of [16, 12, 8, 6, 18, 20, 24, 14, 10])
			expect(abcDuration.fullBarRest(total)).not.toContain("Z");
	});

	it("splits the 5/8 bar rest abcjs can't draw as one rest", () => {
		expect(abcDuration.fullBarRest(10)).toBe("z8 z2");
	});
});

describe("abcDuration.restRun", () => {
	it("merges a run at the bar start into one rest (4/4)", () => {
		expect(abcDuration.restRun(0, 8, 4)).toBe("z8"); // four eighths -> half
		expect(abcDuration.restRun(0, 4, 4)).toBe("z4");
		expect(abcDuration.restRun(8, 8, 4)).toBe("z8"); // beats 3-4 -> half
	});

	it("keeps beat 3 visible: a run across the 4/4 midpoint stays split", () => {
		expect(abcDuration.restRun(4, 8, 4)).toBe("z4 z4");
	});

	it("uses dotted-quarter rests for compound beats", () => {
		expect(abcDuration.restRun(0, 6, 6)).toBe("z6"); // one 6/8 beat
		expect(abcDuration.restRun(0, 12, 6)).toBe("z6 z6"); // two beats, each shown
	});

	it("leaves an offbeat single rest as itself", () => {
		expect(abcDuration.restRun(2, 2, 4)).toBe("z2");
	});
});
