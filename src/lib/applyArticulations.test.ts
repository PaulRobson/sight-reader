import abcjs from "abcjs";
import { describe, expect, it } from "vitest";
import { applyArticulations } from "./applyArticulations.ts";
import { generateForGrade } from "./generateForGrade.ts";
import type { Melody, Note } from "./generateMelody.ts";
import { type Grade, gradeDifficulty } from "./gradeDifficulty.ts";
import { mulberry32 } from "./mulberry32.ts";
import { toAbc } from "./toAbc.ts";

const at = (midi: number, over: Partial<Note> = {}): Note => ({
	midi,
	letter: "C",
	accidental: 0,
	octave: 4,
	duration: 4,
	...over,
});

// A stepwise diatonic-ish line of n notes from a base midi (whole-tone steps).
const steps = (n: number, base = 60): Note[] =>
	Array.from({ length: n }, (_, i) => at(base + i * 2));

const allFour = ["slur", "staccato", "accent", "tenuto"];

describe("applyArticulations", () => {
	it("returns input untouched when the grade allows none", () => {
		const notes = steps(6);
		const out = applyArticulations(notes, [], mulberry32(1));
		expect(out).toBe(notes);
	});

	it("slurs a stepwise group, balancing start and end", () => {
		const out = applyArticulations(steps(3), ["slur"], mulberry32(1));
		expect(out[0].slurStart).toBe(true);
		expect(out[2].slurEnd).toBe(true);
		expect(out.filter((n) => n.slurStart).length).toBe(
			out.filter((n) => n.slurEnd).length,
		);
	});

	it("caps slur length so long runs phrase in groups", () => {
		const out = applyArticulations(steps(10), ["slur"], mulberry32(1));
		const starts = out.flatMap((n, i) => (n.slurStart ? [i] : []));
		const ends = out.flatMap((n, i) => (n.slurEnd ? [i] : []));
		expect(starts.length).toBeGreaterThan(1); // not one giant arc
		for (let g = 0; g < starts.length; g++)
			expect(ends[g] - starts[g] + 1).toBeLessThanOrEqual(4);
	});

	it("slurs a stepwise run that spans middle C as one group", () => {
		// 58,59,60,61: stepwise across middle C. Single-staff render has no split,
		// so the whole run is one slur.
		const notes = [at(58), at(59), at(60), at(61)];
		const out = applyArticulations(notes, ["slur"], mulberry32(1));
		expect(out[0].slurStart).toBe(true);
		expect(out[3].slurEnd).toBe(true);
		expect(out[1].slurEnd).toBeFalsy();
		expect(out[2].slurStart).toBeFalsy();
	});

	it("places staccato only on detached repeats/leaps, accent only on leaps", () => {
		// repeat (60->60), leap (60->67), step (67->69)
		const notes = [at(60), at(60), at(67), at(69)];
		let sawStaccato = false;
		let sawAccent = false;
		for (let seed = 1; seed <= 60; seed++) {
			const out = applyArticulations(
				notes,
				["staccato", "accent"],
				mulberry32(seed),
			);
			out.forEach((n, i) => {
				for (const d of n.decorations ?? []) {
					if (d === "staccato") sawStaccato = true;
					if (d === "accent") {
						sawAccent = true;
						expect(i).toBe(2); // only the leap arrival
					}
				}
			});
		}
		expect(sawStaccato).toBe(true);
		expect(sawAccent).toBe(true);
	});

	it("never marks a slurred note with a point articulation", () => {
		// a wholly stepwise line is entirely slurred, so no point marks may appear
		for (let seed = 1; seed <= 40; seed++) {
			const out = applyArticulations(steps(8), allFour, mulberry32(seed));
			for (const n of out)
				if (n.slurStart || n.slurEnd)
					expect(n.decorations ?? []).toHaveLength(0);
		}
	});

	it("is deterministic for the same inputs", () => {
		const a = applyArticulations(steps(8), allFour, mulberry32(5));
		const b = applyArticulations(steps(8), allFour, mulberry32(5));
		expect(a).toEqual(b);
	});

	it("serialises slur parens and the staccato dot, parsing cleanly", () => {
		const melody: Melody = {
			key: "C",
			bars: 1,
			barUnits: 16,
			notes: [
				at(60, { slurStart: true }),
				at(62),
				at(64, { slurEnd: true }),
				at(67, { decorations: ["staccato"] }),
			],
		};
		const abc = toAbc(melody);
		expect(abc).toContain("(");
		expect(abc).toContain(")");
		expect(abc).toMatch(/\.[A-Ga-g]/); // a staccato dot before a pitch
		expect(abcjs.parseOnly(abc)[0].warnings).toBeUndefined();
	});
});

describe("generateForGrade articulation", () => {
	const hasArtic = (m: Melody) =>
		m.notes.some(
			(n) =>
				n.slurStart ||
				n.slurEnd ||
				(n.decorations ?? []).some((d) =>
					["staccato", "accent", "tenuto"].includes(d),
				),
		);

	it("adds no articulation at grade 1 (vocabulary is empty)", () => {
		expect(gradeDifficulty[1].articulations).toHaveLength(0);
		for (let seed = 1; seed <= 6; seed++) {
			const g1 = generateForGrade({
				grade: 1,
				key: "C",
				lowestMidi: 55,
				highestMidi: 79,
				seed,
			});
			expect(hasArtic(g1)).toBe(false);
		}
	});

	// Grade 4 carries the full articulation palette; grade 8 also spans the odd
	// metres whose whole-bar notes the serializer must tie-split. Both parse clean.
	it("adds the grade-4+ palette across metres, serializing cleanly", () => {
		let sawArtic = false;
		for (const grade of [4, 8] as Grade[]) {
			for (let seed = 1; seed <= 12; seed++) {
				const m = generateForGrade({
					grade,
					key: "C",
					lowestMidi: 55,
					highestMidi: 79,
					seed,
				});
				if (hasArtic(m)) sawArtic = true;
				const abc = toAbc(m, { tempo: m.tempo, meter: m.timeSignature });
				expect(
					abcjs.parseOnly(abc)[0].warnings,
					`g${grade} s${seed}`,
				).toBeUndefined();
			}
		}
		expect(sawArtic).toBe(true);
	});
});
