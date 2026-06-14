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
			c8 d4 e4 | c4 A4 B8 | c4 B4 A4 G4 | F4 G4 D4 C4 |"
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

	it("emits z tokens for rested slots and still parses cleanly", () => {
		const melody = generateMelody(grade1);
		melody.notes[1] = { ...melody.notes[1], rest: true };
		const abc = toAbc(melody);
		expect(abc).toMatch(/z\d/); // a rest with a length multiplier
		const tunes = abcjs.parseOnly(abc);
		expect(tunes[0].warnings).toBeUndefined();
	});
});
