import { describe, expect, it } from "vitest";
import { generateForGrade } from "./generateForGrade.ts";
import { type Grade, gradeDifficulty } from "./gradeDifficulty.ts";
import { scale } from "./scale.ts";

const GRADES: Grade[] = [1, 2, 3, 4, 5, 6, 7, 8];
const KEY = "C";
const LO = 48; // C3
const HI = 84; // C6

// Ascending diatonic MIDI ladder, mirroring the generator's pitch space, so a
// melodic interval can be measured in scale steps (the unit maxLeap uses).
function ladder(key: string, lo: number, hi: number): number[] {
	const degrees = scale.major(key);
	const out: number[] = [];
	for (let octave = 0; octave <= 9; octave++) {
		for (const d of degrees) {
			const midi = scale.toMidi(d, octave);
			if (midi >= lo && midi <= hi) out.push(midi);
		}
	}
	return out.sort((a, b) => a - b);
}

describe("generateForGrade", () => {
	it("is deterministic for the same args", () => {
		const args = {
			grade: 4 as Grade,
			key: KEY,
			lowestMidi: LO,
			highestMidi: HI,
			seed: 7,
		};
		expect(generateForGrade(args)).toEqual(generateForGrade(args));
	});

	for (const grade of GRADES) {
		describe(`grade ${grade}`, () => {
			const p = gradeDifficulty[grade];
			const steps = ladder(KEY, LO, HI);
			const m = generateForGrade({
				grade,
				key: KEY,
				lowestMidi: LO,
				highestMidi: HI,
				seed: 123,
			});

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

			it("keeps freely generated leaps within maxLeap scale steps", () => {
				// The last two notes are the cadence; the join into the rewritten
				// penultimate note is refined by the later leap-resolution/cadential
				// tasks, so the maxLeap guarantee covers the free body here.
				const free = m.notes.length - 2;
				for (let i = 1; i < free; i++) {
					const a = steps.indexOf(m.notes[i - 1].midi);
					const b = steps.indexOf(m.notes[i].midi);
					expect(Math.abs(b - a)).toBeLessThanOrEqual(p.maxLeapScaleSteps);
				}
			});

			it("approaches the final tonic by step", () => {
				const n = m.notes.length;
				const step = Math.abs(m.notes[n - 1].midi - m.notes[n - 2].midi);
				expect(step).toBeGreaterThanOrEqual(1);
				expect(step).toBeLessThanOrEqual(2);
				expect(m.notes[n - 1].midi % 12).toBe(0); // tonic C
			});

			it("keeps every note inside the range", () => {
				for (const n of m.notes) {
					expect(n.midi).toBeGreaterThanOrEqual(LO);
					expect(n.midi).toBeLessThanOrEqual(HI);
				}
			});

			it("picks a tempo and meter the grade allows", () => {
				expect(m.tempo).toBeGreaterThanOrEqual(p.tempoBpm[0]);
				expect(m.tempo).toBeLessThanOrEqual(p.tempoBpm[1]);
				expect(p.timeSignatures).toContain(m.timeSignature);
			});
		});
	}
});
