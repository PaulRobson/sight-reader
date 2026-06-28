import { describe, expect, it } from "vitest";
import type { Note } from "./generateMelody.ts";
import { insertAccidentals } from "./insertAccidentals.ts";
import { mulberry32 } from "./mulberry32.ts";
import { scale } from "./scale.ts";

const C_MAJOR = new Set(scale.major("C").map((d) => d.pitchClass));
const args = { scalePitchClasses: C_MAJOR, lowestMidi: 48, highestMidi: 84 };

// A pool of diatonic C-major notes across octaves 4–5 (midi 60–83), all inside
// the [48, 84] range; makeNotes cycles it so every slot stays in range.
const POOL: Note[] = [4, 5].flatMap((octave) =>
	scale.major("C").map((degree) => ({
		midi: scale.toMidi(degree, octave),
		letter: degree.letter,
		accidental: degree.accidental,
		octave,
		duration: 4,
	})),
);

const makeNotes = (count: number): Note[] =>
	Array.from({ length: count }, (_, i) => ({ ...POOL[i % POOL.length] }));

const pc = (midi: number) => ((midi % 12) + 12) % 12;

describe("insertAccidentals", () => {
	it("makes no change at breadth none", () => {
		const input = makeNotes(16);
		expect(insertAccidentals(input, "none", args, mulberry32(1))).toEqual(
			input,
		);
	});

	it("only ever produces pitches outside the key, spelled with a single accidental", () => {
		const out = insertAccidentals(
			makeNotes(40),
			"modulation",
			args,
			mulberry32(2),
		);
		for (const n of out) {
			if (Math.abs(n.accidental) === 1) {
				expect(C_MAJOR.has(pc(n.midi))).toBe(false);
			}
		}
	});

	it("leaves the opening note and the final two-note cadence diatonic", () => {
		const input = makeNotes(24);
		const out = insertAccidentals(input, "modulation", args, mulberry32(5));
		expect(out[0]).toEqual(input[0]);
		expect(out[out.length - 1]).toEqual(input[input.length - 1]);
		expect(out[out.length - 2]).toEqual(input[input.length - 2]);
	});

	it("keeps every inflected note inside the range", () => {
		const out = insertAccidentals(
			makeNotes(40),
			"frequent",
			args,
			mulberry32(9),
		);
		for (const n of out) {
			expect(n.midi).toBeGreaterThanOrEqual(args.lowestMidi);
			expect(n.midi).toBeLessThanOrEqual(args.highestMidi);
		}
	});

	it("inflects more notes at a broader breadth", () => {
		const count = (breadth: Parameters<typeof insertAccidentals>[1]) =>
			insertAccidentals(makeNotes(200), breadth, args, mulberry32(11)).filter(
				(n) => Math.abs(n.accidental) === 1,
			).length;
		expect(count("frequent")).toBeGreaterThan(count("rare"));
	});

	it("is deterministic for the same seed", () => {
		const a = insertAccidentals(makeNotes(40), "regular", args, mulberry32(7));
		const b = insertAccidentals(makeNotes(40), "regular", args, mulberry32(7));
		expect(a).toEqual(b);
	});
});
