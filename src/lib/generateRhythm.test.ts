import abcjs from "abcjs";
import { describe, expect, it } from "vitest";
import { generateRhythm } from "./generateRhythm.ts";
import { type Grade, gradeDifficulty } from "./gradeDifficulty.ts";
import { toAbc } from "./toAbc.ts";

const GRADES: Grade[] = [1, 2, 3, 4, 5, 6, 7, 8];

describe("generateRhythm", () => {
	it("is deterministic for the same args", () => {
		const args = { grade: 5 as Grade, seed: 7 };
		expect(generateRhythm(args)).toEqual(generateRhythm(args));
	});

	it("fixes every slot to one pitch with no rests or melodic decorations", () => {
		for (const grade of GRADES) {
			for (let seed = 1; seed <= 8; seed++) {
				const m = generateRhythm({ grade, seed });
				for (const n of m.notes) {
					expect(n.midi).toBe(71); // B4, sits on the single perc line
					expect(n.letter).toBe("B");
					expect(n.octave).toBe(4);
					expect(n.accidental).toBe(0);
					expect(n.rest).toBeFalsy();
					expect(n.decorations).toBeUndefined();
					expect(n.slurStart).toBeFalsy();
					expect(n.slurEnd).toBeFalsy();
				}
			}
		}
	});

	it("is keyless (C, no signature to read)", () => {
		expect(generateRhythm({ grade: 4, seed: 3 }).key).toBe("C");
	});

	it("serialises to a single-line percussion staff that parses cleanly", () => {
		for (const grade of GRADES) {
			for (let seed = 1; seed <= 5; seed++) {
				const m = generateRhythm({ grade, seed });
				const abc = toAbc(m, {
					tempo: m.tempo,
					meter: m.timeSignature,
					percussion: true,
				});
				expect(abc).toContain("clef=perc stafflines=1");
				expect(abc).not.toContain("%%score"); // single line, not a grand staff
				expect(
					abcjs.parseOnly(abc)[0].warnings,
					`g${grade} s${seed}`,
				).toBeUndefined();
			}
		}
	});

	it("ramps rhythm with grade: quarters only at grade 1, sixteenths reachable high up", () => {
		for (let seed = 1; seed <= 10; seed++) {
			const m = generateRhythm({ grade: 1, seed });
			expect(
				Math.min(...m.notes.map((n) => n.duration)),
			).toBeGreaterThanOrEqual(4);
		}
		let sawSixteenth = false;
		for (const grade of [5, 6, 7, 8] as Grade[]) {
			for (let seed = 1; seed <= 15 && !sawSixteenth; seed++) {
				const m = generateRhythm({ grade, seed });
				if (m.notes.some((n) => n.duration === 1)) sawSixteenth = true;
			}
		}
		expect(sawSixteenth).toBe(true);
	});

	for (const grade of GRADES) {
		describe(`grade ${grade}`, () => {
			const p = gradeDifficulty[grade];
			const m = generateRhythm({ grade, seed: 123 });

			it("picks a bar count within the grade's range", () => {
				expect(m.bars).toBeGreaterThanOrEqual(p.bars[0]);
				expect(m.bars).toBeLessThanOrEqual(p.bars[1]);
			});

			it("fills exactly the bars at the meter's bar length", () => {
				const total = m.notes.reduce((s, n) => s + n.duration, 0);
				expect(total).toBe(m.bars * m.barUnits);
			});

			it("uses no note shorter than the grade's shortest note", () => {
				for (const n of m.notes)
					expect(n.duration).toBeGreaterThanOrEqual(p.shortestNoteSixteenths);
			});

			it("picks a tempo and meter the grade allows", () => {
				expect(m.tempo).toBeGreaterThanOrEqual(p.tempoBpm[0]);
				expect(m.tempo).toBeLessThanOrEqual(p.tempoBpm[1]);
				expect(p.timeSignatures).toContain(m.timeSignature);
			});
		});
	}
});
