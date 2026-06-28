import { describe, expect, it } from "vitest";
import { generateForGrade } from "./generateForGrade.ts";
import { type Grade, gradeDifficulty } from "./gradeDifficulty.ts";
import { rhythm } from "./rhythm.ts";
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

	it("inserts rests per the grade's probability, never at the endpoints", () => {
		let totalRests = 0;
		for (let seed = 1; seed <= 10; seed++) {
			const m = generateForGrade({
				grade: 8, // highest rest probability (0.4)
				key: KEY,
				lowestMidi: LO,
				highestMidi: HI,
				seed,
			});
			expect(m.notes[0].rest).toBeFalsy();
			expect(m.notes[m.notes.length - 1].rest).toBeFalsy();
			totalRests += m.notes.filter((n) => n.rest).length;
		}
		expect(totalRests).toBeGreaterThan(0); // the probability is actually wired in
	});

	it("matches barUnits to the chosen meter and varies meter across seeds", () => {
		const seen = new Set<string>();
		for (let seed = 1; seed <= 20; seed++) {
			const m = generateForGrade({
				grade: 6, // nine allowed time signatures
				key: KEY,
				lowestMidi: LO,
				highestMidi: HI,
				seed,
			});
			expect(m.barUnits).toBe(rhythm.meters[m.timeSignature].barUnits);
			seen.add(m.timeSignature);
		}
		expect(seen.size).toBeGreaterThan(1); // selection actually spans meters
	});

	it("derives a key within the grade's signature breadth, and honours an override", () => {
		const sigSize = (key: string) =>
			scale.major(key).filter((d) => d.accidental !== 0).length;
		for (const grade of GRADES) {
			const max = gradeDifficulty[grade].maxKeyAccidentals;
			for (let seed = 1; seed <= 8; seed++) {
				const m = generateForGrade({
					grade,
					lowestMidi: LO,
					highestMidi: HI,
					seed,
				});
				expect(sigSize(m.key)).toBeLessThanOrEqual(max);
			}
		}
		const pinned = generateForGrade({
			grade: 8,
			key: "C",
			lowestMidi: LO,
			highestMidi: HI,
			seed: 1,
		});
		expect(pinned.key).toBe("C");
	});

	it("never emits a whole-bar rest", () => {
		const barAllRest = (m: ReturnType<typeof generateForGrade>): boolean[] => {
			const flags: boolean[] = [];
			let acc = 0;
			let all = true;
			for (const n of m.notes) {
				all = all && !!n.rest;
				acc += n.duration;
				if (acc % m.barUnits === 0) {
					flags.push(all);
					all = true;
				}
			}
			return flags;
		};
		for (const grade of [4, 5, 6, 7, 8] as Grade[]) {
			for (let seed = 1; seed <= 15; seed++) {
				const flags = barAllRest(
					generateForGrade({
						grade,
						key: KEY,
						lowestMidi: LO,
						highestMidi: HI,
						seed,
					}),
				);
				expect(flags).not.toContain(true);
			}
		}
	});

	it("ramps rhythm: no sub-quarter notes at grade 1, sixteenths reachable high up", () => {
		for (let seed = 1; seed <= 10; seed++) {
			const m = generateForGrade({
				grade: 1,
				key: KEY,
				lowestMidi: LO,
				highestMidi: HI,
				seed,
			});
			const shortest = Math.min(...m.notes.map((n) => n.duration));
			expect(shortest).toBeGreaterThanOrEqual(4); // quarter at grade 1
		}
		let sawSixteenth = false;
		for (const grade of [5, 6, 7, 8] as Grade[]) {
			for (let seed = 1; seed <= 15 && !sawSixteenth; seed++) {
				const m = generateForGrade({
					grade,
					key: KEY,
					lowestMidi: LO,
					highestMidi: HI,
					seed,
				});
				if (m.notes.some((n) => n.duration === 1)) sawSixteenth = true;
			}
		}
		expect(sawSixteenth).toBe(true);
	});

	it("anchors the tessitura near centerMidi when given", () => {
		const at = (centerMidi: number) =>
			generateForGrade({
				grade: 1,
				key: KEY,
				lowestMidi: 36, // C2
				highestMidi: 96, // C7
				seed: 5,
				centerMidi,
			}).notes[0].midi; // opening note is the start tonic
		expect(at(48)).toBe(48); // nearest C to C3
		expect(at(84)).toBe(84); // nearest C to C6
	});

	it("inserts chromatic notes at high grades but none at grade 1", () => {
		const chromaticCount = (grade: Grade) => {
			let total = 0;
			for (let seed = 1; seed <= 10; seed++) {
				const m = generateForGrade({
					grade,
					key: KEY,
					lowestMidi: LO,
					highestMidi: HI,
					seed,
				});
				const inKey = new Set(scale.major(KEY).map((d) => d.pitchClass));
				total += m.notes.filter(
					(n) => !inKey.has(((n.midi % 12) + 12) % 12),
				).length;
			}
			return total;
		};
		expect(chromaticCount(1)).toBe(0); // breadth "none"
		expect(chromaticCount(8)).toBeGreaterThan(0); // breadth "modulation"
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
				// Chromatic notes (off the diatonic ladder) carry no scale-step
				// interval, so pairs touching one are skipped.
				const free = m.notes.length - 2;
				for (let i = 1; i < free; i++) {
					const a = steps.indexOf(m.notes[i - 1].midi);
					const b = steps.indexOf(m.notes[i].midi);
					if (a === -1 || b === -1) continue;
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
