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
	it("uses Z for representable bar lengths", () => {
		for (const total of [16, 12, 8, 6, 18, 20, 24, 14])
			expect(abcDuration.fullBarRest(total)).toBe("Z");
	});

	it("splits the 5/8 bar rest abcjs can't draw as one Z", () => {
		expect(abcDuration.fullBarRest(10)).toBe("z8 z2");
	});
});
