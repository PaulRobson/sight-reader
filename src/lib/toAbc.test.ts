import abcjs from "abcjs";
import { describe, expect, it } from "vitest";
import {
	type GeneratorOptions,
	generateMelody,
	type Melody,
} from "./generateMelody.ts";
import { rhythm } from "./rhythm.ts";
import { type SerializeOptions, toAbc } from "./toAbc.ts";

const grade1: GeneratorOptions = {
	seed: 42,
	key: "C",
	bars: 4,
	lowestMidi: 60,
	highestMidi: 84,
	stepBias: 0.85,
	maxLeap: 2,
	meter: rhythm.restrict(rhythm.meters["4/4"], 4), // grade-1 rhythm: quarter+
};

describe("toAbc", () => {
	it("serialises a grade-1 C-major piece (snapshot)", () => {
		expect(toAbc(generateMelody(grade1))).toMatchInlineSnapshot(`
			"X:1
			T:Exercise
			M:4/4
			L:1/16
			Q:1/4=70
			K:C clef=treble
			%%MIDI program 0
			c4 d4 e4 c4 | A8 B4 c4 | B4 A8 G4 | F4 G4 D4 C4 |"
		`);
	});

	it("emits header fields and one bar line per bar", () => {
		const opts: SerializeOptions = { tempo: 96, program: 40, clef: "bass" };
		const abc = toAbc(generateMelody(grade1), opts);
		expect(abc).toContain("Q:1/4=96");
		expect(abc).toContain("K:C clef=bass");
		expect(abc).toContain("%%MIDI program 40");
		expect((abc.match(/\|/g) ?? []).length).toBe(grade1.bars);
	});

	it("parses cleanly via abcjs (no warnings)", () => {
		const tunes = abcjs.parseOnly(toAbc(generateMelody(grade1)));
		expect(tunes).toHaveLength(1);
		expect(tunes[0].warnings).toBeUndefined();
		expect(tunes[0].lines.length).toBeGreaterThan(0);
	});

	it("renders out-of-octave pitches with abc octave marks", () => {
		const abc = toAbc(
			generateMelody({ ...grade1, lowestMidi: 48, highestMidi: 72 }),
		);
		expect(abc).toMatch(/[A-G],/); // a note below middle C
	});

	it("emits the requested meter and parses a compound-meter piece cleanly", () => {
		const sixEight = generateMelody({ ...grade1, meter: rhythm.meters["6/8"] });
		const abc = toAbc(sixEight, { meter: "6/8" });
		expect(abc).toContain("M:6/8");
		const tunes = abcjs.parseOnly(abc);
		expect(tunes[0].warnings).toBeUndefined();
		// bar lines follow the 6/8 bar length (12 sixteenths)
		expect((abc.match(/\|/g) ?? []).length).toBe(grade1.bars);
	});

	it("emits an explicit accidental for a chromatic note and cancels it within the bar", () => {
		const melody: Melody = {
			key: "C",
			bars: 1,
			barUnits: 16,
			notes: [
				{ midi: 60, letter: "C", accidental: 0, octave: 4, duration: 4 },
				{ midi: 61, letter: "C", accidental: 1, octave: 4, duration: 4 }, // C#
				{ midi: 60, letter: "C", accidental: 0, octave: 4, duration: 4 }, // natural again
				{ midi: 62, letter: "D", accidental: 0, octave: 4, duration: 4 },
			],
		};
		const abc = toAbc(melody);
		expect(abc).toContain("^C"); // the chromatic sharp
		expect(abc).toContain("=C"); // natural cancels the earlier sharp within the bar
		expect(abcjs.parseOnly(abc)[0].warnings).toBeUndefined();
	});

	it("renders an in-key sharp via the key signature, with no explicit accidental", () => {
		const melody: Melody = {
			key: "G",
			bars: 1,
			barUnits: 16,
			notes: [
				{ midi: 66, letter: "F", accidental: 1, octave: 4, duration: 8 }, // F# in G
				{ midi: 67, letter: "G", accidental: 0, octave: 4, duration: 8 },
			],
		};
		const abc = toAbc(melody);
		expect(abc).toContain("K:G");
		expect(abc).not.toContain("^F"); // the key signature already sharps F
		expect(abcjs.parseOnly(abc)[0].warnings).toBeUndefined();
	});

	it("renders a grand staff as two voices split at middle C", () => {
		const melody: Melody = {
			key: "C",
			bars: 1,
			barUnits: 16,
			notes: [
				{ midi: 72, letter: "C", accidental: 0, octave: 5, duration: 4 }, // treble
				{ midi: 55, letter: "G", accidental: 0, octave: 3, duration: 4 }, // bass
				{ midi: 64, letter: "E", accidental: 0, octave: 4, duration: 4 }, // treble
				{ midi: 48, letter: "C", accidental: 0, octave: 3, duration: 4 }, // bass
			],
		};
		const abc = toAbc(melody, { grandStaff: true });
		expect(abc).toContain("%%score {1 2}");
		expect(abc).toContain("V:1 clef=treble");
		expect(abc).toContain("V:2 clef=bass");
		const lines = abc.split("\n");
		const v1 = lines.find((l) => l.startsWith("[V:1]")) ?? "";
		const v2 = lines.find((l) => l.startsWith("[V:2]")) ?? "";
		expect(v1).toContain("z"); // rest where a bass note sits
		expect(v2).toContain("z"); // rest where a treble note sits
		expect(abcjs.parseOnly(abc)[0].warnings).toBeUndefined();
	});

	it("beams runs of eighths within a beat and breaks at the beat and quarters", () => {
		const e = (): Melody["notes"][number] => ({
			midi: 60,
			letter: "C",
			accidental: 0,
			octave: 4,
			duration: 2,
		});
		const q = { midi: 60, letter: "C", accidental: 0, octave: 4, duration: 4 };
		const melody: Melody = {
			key: "C",
			bars: 1,
			barUnits: 16,
			notes: [e(), e(), e(), e(), q, q], // 4 eighths (two beats) + 2 quarters
		};
		const abc = toAbc(melody);
		expect(abc).toContain("C2C2 C2C2 C4 C4"); // beamed pairs, broken at beats/quarters
		expect(abcjs.parseOnly(abc)[0].warnings).toBeUndefined();
	});

	it("beams a dotted-eighth + sixteenth pair", () => {
		const melody: Melody = {
			key: "C",
			bars: 1,
			barUnits: 16,
			notes: [
				{ midi: 60, letter: "C", accidental: 0, octave: 4, duration: 3 }, // dotted-eighth
				{ midi: 62, letter: "D", accidental: 0, octave: 4, duration: 1 }, // sixteenth
				{ midi: 60, letter: "C", accidental: 0, octave: 4, duration: 4 },
				{ midi: 60, letter: "C", accidental: 0, octave: 4, duration: 8 },
			],
		};
		const abc = toAbc(melody);
		expect(abc).toContain("C3D"); // dotted-eighth beamed to the sixteenth
		expect(abcjs.parseOnly(abc)[0].warnings).toBeUndefined();
	});

	it("collapses an all-rest bar to a single measure rest", () => {
		const melody: Melody = {
			key: "C",
			bars: 2,
			barUnits: 16,
			notes: [
				{ midi: 60, letter: "C", accidental: 0, octave: 4, duration: 16 },
				// bar 2: only rests, of differing lengths
				{
					midi: 60,
					letter: "C",
					accidental: 0,
					octave: 4,
					duration: 8,
					rest: true,
				},
				{
					midi: 60,
					letter: "C",
					accidental: 0,
					octave: 4,
					duration: 4,
					rest: true,
				},
				{
					midi: 60,
					letter: "C",
					accidental: 0,
					octave: 4,
					duration: 4,
					rest: true,
				},
			],
		};
		const abc = toAbc(melody);
		expect(abc).toContain("z16"); // one measure-filling rest (abcjs centres it)
		expect(abc).not.toContain("Z"); // not abc's multi-measure rest (no "1" count)
		expect(abcjs.parseOnly(abc)[0].warnings).toBeUndefined();
	});

	it("serialises a whole-bar rest in every meter with no warning", () => {
		for (const [meter, m] of Object.entries(rhythm.meters)) {
			const abc = toAbc(
				{
					key: "C",
					bars: 1,
					barUnits: m.barUnits,
					notes: [
						{
							midi: 60,
							letter: "C",
							accidental: 0,
							octave: 4,
							duration: m.barUnits,
							rest: true,
						},
					],
				},
				{ meter },
			);
			expect(abc).not.toContain("Z");
			expect(abcjs.parseOnly(abc)[0].warnings, meter).toBeUndefined();
		}
	});

	it("serialises a whole-bar note in every meter with no unrepresentable-duration warning", () => {
		for (const [meter, m] of Object.entries(rhythm.meters)) {
			const melody: Melody = {
				key: "C",
				bars: 1,
				barUnits: m.barUnits,
				notes: [
					{
						midi: 60,
						letter: "C",
						accidental: 0,
						octave: 4,
						duration: m.barUnits,
					},
				],
			};
			const abc = toAbc(melody, { meter });
			expect(abcjs.parseOnly(abc)[0].warnings, meter).toBeUndefined();
		}
		// 5/8's 10-sixteenth bar is the one abcjs can't draw whole, so it ties
		const fiveEight = toAbc(
			{
				key: "C",
				bars: 1,
				barUnits: 10,
				notes: [
					{ midi: 60, letter: "C", accidental: 0, octave: 4, duration: 10 },
				],
			},
			{ meter: "5/8" },
		);
		expect(fiveEight).toContain("C8-C2");
	});

	it("merges consecutive rests into a single rest value", () => {
		const melody: Melody = {
			key: "C",
			bars: 1,
			barUnits: 16,
			notes: [
				{ midi: 60, letter: "C", accidental: 0, octave: 4, duration: 8 }, // half note, beats 1-2
				// beats 3-4: four eighth rests that should merge to one half rest
				{
					midi: 60,
					letter: "C",
					accidental: 0,
					octave: 4,
					duration: 2,
					rest: true,
				},
				{
					midi: 60,
					letter: "C",
					accidental: 0,
					octave: 4,
					duration: 2,
					rest: true,
				},
				{
					midi: 60,
					letter: "C",
					accidental: 0,
					octave: 4,
					duration: 2,
					rest: true,
				},
				{
					midi: 60,
					letter: "C",
					accidental: 0,
					octave: 4,
					duration: 2,
					rest: true,
				},
			],
		};
		const abc = toAbc(melody);
		expect(abc).toContain("z8");
		expect(abc).not.toContain("z2");
		expect(abcjs.parseOnly(abc)[0].warnings).toBeUndefined();
	});

	it("renders a single-line percussion staff for rhythm-only mode", () => {
		const abc = toAbc(generateMelody(grade1), { percussion: true });
		expect(abc).toContain("K:C clef=perc stafflines=1");
		expect(abc).not.toContain("%%score");
		expect(abcjs.parseOnly(abc)[0].warnings).toBeUndefined();
	});

	it("emits z tokens for rested slots and still parses cleanly", () => {
		const melody = generateMelody(grade1);
		melody.notes[1] = { ...melody.notes[1], rest: true };
		const abc = toAbc(melody);
		expect(abc).toMatch(/z\d/); // a rest with a length multiplier
		const tunes = abcjs.parseOnly(abc);
		expect(tunes[0].warnings).toBeUndefined();
	});
});
