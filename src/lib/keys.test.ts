import { describe, expect, it } from "vitest";
import { gradeDifficulty } from "./gradeDifficulty.ts";
import { keys } from "./keys.ts";
import { mulberry32 } from "./mulberry32.ts";
import { scale } from "./scale.ts";

// A major key's signature size = number of degrees spelled with an accidental.
function signatureSize(key: string): number {
	return scale.major(key).filter((d) => d.accidental !== 0).length;
}

describe("keys.within", () => {
	it("returns only C at zero accidentals", () => {
		expect(keys.within(0)).toEqual(["C"]);
	});

	it("widens monotonically and never exceeds the requested signature size", () => {
		for (let max = 0; max <= 7; max++) {
			for (const key of keys.within(max))
				expect(signatureSize(key)).toBeLessThanOrEqual(max);
		}
		expect(keys.within(7).length).toBeGreaterThan(keys.within(1).length);
	});
});

describe("keys.pick", () => {
	it("stays within the grade's key-signature breadth for every grade", () => {
		for (let g = 1; g <= 8; g++) {
			const max = gradeDifficulty[g as 1].maxKeyAccidentals;
			for (let seed = 1; seed <= 20; seed++) {
				const key = keys.pick(max, mulberry32(seed));
				expect(signatureSize(key)).toBeLessThanOrEqual(max);
			}
		}
	});

	it("is deterministic for the same seed", () => {
		expect(keys.pick(5, mulberry32(3))).toBe(keys.pick(5, mulberry32(3)));
	});

	it("spans more than one key when the breadth allows", () => {
		const seen = new Set<string>();
		for (let seed = 1; seed <= 30; seed++)
			seen.add(keys.pick(5, mulberry32(seed)));
		expect(seen.size).toBeGreaterThan(1);
	});
});
