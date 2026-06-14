import { describe, expect, it } from "vitest";
import { type ScaleNote, scale } from "./scale.ts";

const letters = (notes: ScaleNote[]) => notes.map((n) => n.letter).join("");
const pcs = (notes: ScaleNote[]) => notes.map((n) => n.pitchClass);

describe("scale.major", () => {
	it("builds C major with no accidentals", () => {
		const s = scale.major("C");
		expect(letters(s)).toBe("CDEFGAB");
		expect(pcs(s)).toEqual([0, 2, 4, 5, 7, 9, 11]);
		expect(s.every((n) => n.accidental === 0)).toBe(true);
	});

	it("builds G major with F sharp (one-sharp key)", () => {
		const s = scale.major("G");
		expect(letters(s)).toBe("GABCDEF");
		expect(pcs(s)).toEqual([7, 9, 11, 0, 2, 4, 6]);
		expect(s[6]).toMatchObject({ letter: "F", accidental: 1 });
		expect(s.slice(0, 6).every((n) => n.accidental === 0)).toBe(true);
	});

	it("builds F major with B flat (one-flat key)", () => {
		const s = scale.major("F");
		expect(letters(s)).toBe("FGABCDE");
		expect(pcs(s)).toEqual([5, 7, 9, 10, 0, 2, 4]);
		expect(s[3]).toMatchObject({ letter: "B", accidental: -1 });
	});

	it("parses an explicit accidental in the tonic (Bb major)", () => {
		const s = scale.major("Bb");
		expect(letters(s)).toBe("BCDEFGA");
		expect(s[0]).toMatchObject({ letter: "B", accidental: -1 });
		expect(s[3]).toMatchObject({ letter: "E", accidental: -1 });
	});
});

describe("scale.chordTones", () => {
	it("returns degrees 1, 3, 5", () => {
		const tones = scale.chordTones(scale.major("C"));
		expect(letters(tones)).toBe("CEG");
		expect(pcs(tones)).toEqual([0, 4, 7]);
	});
});
