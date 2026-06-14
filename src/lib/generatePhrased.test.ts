import { describe, expect, it } from "vitest";
import {
	generatePhrased,
	type PhrasedOptions,
	type PhraseScheme,
	schemeForGrade,
} from "./generatePhrased.ts";
import type { Grade } from "./gradeDifficulty.ts";

const BASE: Omit<PhrasedOptions, "scheme"> = {
	seed: 7,
	key: "C",
	bars: 16, // 4 phrases of 4 bars
	lowestMidi: 48, // C3
	highestMidi: 84, // C6
	stepBias: 0.7,
	maxLeap: 4,
	phraseBars: 4,
};

const opts = (scheme: PhraseScheme, over: Partial<PhrasedOptions> = {}) => ({
	...BASE,
	scheme,
	...over,
});

describe("schemeForGrade", () => {
	it("maps grades to literal → transposed → varied repetition", () => {
		const got = ([1, 2, 3, 4, 5, 6, 7, 8] as Grade[]).map(schemeForGrade);
		expect(got).toEqual([
			"AABA",
			"AABA",
			"sequence",
			"sequence",
			"sequence",
			"vary",
			"vary",
			"vary",
		]);
	});
});

describe("generatePhrased", () => {
	it("is deterministic for the same options", () => {
		expect(generatePhrased(opts("AABA"))).toEqual(
			generatePhrased(opts("AABA")),
		);
	});

	it("splits the piece into bars / phraseBars phrases", () => {
		const r = generatePhrased(opts("sequence"));
		expect(r.phrases).toHaveLength(4);
	});

	it("fills exactly the requested bars", () => {
		for (const scheme of ["AABA", "sequence", "vary"] as PhraseScheme[]) {
			const m = generatePhrased(opts(scheme)).melody;
			const total = m.notes.reduce((s, n) => s + n.duration, 0);
			expect(total).toBe(BASE.bars * m.barUnits);
		}
	});

	it("keeps every note in range and every interval within maxLeap", () => {
		for (const scheme of ["AABA", "sequence", "vary"] as PhraseScheme[]) {
			const notes = generatePhrased(opts(scheme)).melody.notes;
			for (const n of notes) {
				expect(n.midi).toBeGreaterThanOrEqual(BASE.lowestMidi);
				expect(n.midi).toBeLessThanOrEqual(BASE.highestMidi);
			}
		}
	});

	describe("AABA", () => {
		it("repeats phrase A's rhythm and contour and contrasts the penultimate", () => {
			const p = generatePhrased(opts("AABA")).phrases;
			// 4 phrases → A A B A.
			expect(p[1].durations).toEqual(p[0].durations);
			expect(p[1].deltas).toEqual(p[0].deltas);
			expect(p[3].durations).toEqual(p[0].durations);
			expect(p[3].deltas).toEqual(p[0].deltas);
			expect(p[2].deltas).not.toEqual(p[0].deltas); // B contrasts
			expect(p[0].connector).toBeNull();
			expect(p[1].connector).not.toBeNull();
		});
	});

	describe("sequence", () => {
		it("transposes one contour by a constant step each phrase", () => {
			const p = generatePhrased(opts("sequence")).phrases;
			for (let i = 1; i < p.length; i++) {
				expect(p[i].deltas).toEqual(p[0].deltas);
				expect(p[i].durations).toEqual(p[0].durations);
			}
			const dirs = p.slice(1).map((s) => s.connector);
			expect(dirs.every((d) => d === dirs[0])).toBe(true);
			expect(Math.abs(dirs[0] as number)).toBe(1);
		});
	});

	describe("vary", () => {
		it("reuses the rhythm but re-derives the pitches", () => {
			const p = generatePhrased(opts("vary")).phrases;
			for (let i = 1; i < p.length; i++)
				expect(p[i].durations).toEqual(p[0].durations);
			const someDiffer = p
				.slice(1)
				.some((s) => JSON.stringify(s.deltas) !== JSON.stringify(p[0].deltas));
			expect(someDiffer).toBe(true);
		});
	});

	it("never exceeds maxLeap on any phrase connector or interior move", () => {
		for (const scheme of ["AABA", "sequence", "vary"] as PhraseScheme[]) {
			const phrases = generatePhrased(opts(scheme)).phrases;
			for (const span of phrases) {
				if (span.connector !== null)
					expect(Math.abs(span.connector)).toBeLessThanOrEqual(BASE.maxLeap);
				for (const d of span.deltas)
					expect(Math.abs(d)).toBeLessThanOrEqual(BASE.maxLeap);
			}
		}
	});

	it("collapses to a single phrase when only one fits", () => {
		const r = generatePhrased(opts("AABA", { bars: 4 }));
		expect(r.phrases).toHaveLength(1);
		expect(r.phrases[0].connector).toBeNull();
	});
});
