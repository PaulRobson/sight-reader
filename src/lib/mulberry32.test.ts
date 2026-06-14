import { describe, expect, it } from "vitest";
import { mulberry32 } from "./mulberry32.ts";

describe("mulberry32", () => {
	it("reproduces the exact sequence for the same seed", () => {
		const a = mulberry32(12345);
		const b = mulberry32(12345);
		const seqA = Array.from({ length: 10 }, () => a());
		const seqB = Array.from({ length: 10 }, () => b());
		expect(seqA).toEqual(seqB);
	});

	it("produces different sequences for different seeds", () => {
		const a = mulberry32(1);
		const b = mulberry32(2);
		expect(a()).not.toBe(b());
	});

	it("yields values in [0, 1)", () => {
		const rng = mulberry32(987654321);
		for (let i = 0; i < 1000; i++) {
			const v = rng();
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(1);
		}
	});

	it("advances state on each call", () => {
		const rng = mulberry32(42);
		expect(rng()).not.toBe(rng());
	});

	it("matches a known reference sequence (regression guard)", () => {
		const rng = mulberry32(0);
		const seq = [rng(), rng(), rng()];
		expect(seq).toEqual([
			0.26642920868471265, 0.0003297457005828619, 0.2232720274478197,
		]);
	});
});
