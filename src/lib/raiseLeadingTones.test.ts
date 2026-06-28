import { describe, expect, it } from "vitest";
import type { Note } from "./generateMelody.ts";
import { raiseLeadingTones } from "./raiseLeadingTones.ts";

const n = (midi: number, over: Partial<Note> = {}): Note => ({
	midi,
	letter: "C",
	accidental: 0,
	octave: 4,
	duration: 4,
	...over,
});

describe("raiseLeadingTones", () => {
	it("leaves major keys untouched", () => {
		const notes = [n(67), n(69)];
		expect(raiseLeadingTones(notes, "C")).toBe(notes);
	});

	it("raises the subtonic resolving up to the tonic (A minor: G->G#)", () => {
		// G4(67) -> A4(69): a step up to the tonic
		const out = raiseLeadingTones(
			[n(67, { letter: "G" }), n(69, { letter: "A" })],
			"Am",
		);
		expect(out[0]).toMatchObject({ midi: 68, accidental: 1, letter: "G" });
		expect(out[1].midi).toBe(69); // tonic unchanged
	});

	it("turns a flat subtonic natural (C minor: Bb->B)", () => {
		// Bb3(58) -> C4(60)
		const out = raiseLeadingTones(
			[
				n(58, { letter: "B", accidental: -1, octave: 3 }),
				n(60, { letter: "C" }),
			],
			"Cm",
		);
		expect(out[0]).toMatchObject({ midi: 59, accidental: 0 });
	});

	it("does not raise a subtonic that falls to a lower tonic", () => {
		// G4(67) -> A3(57): descending, melodic-minor keeps the natural 7th
		const notes = [n(67, { letter: "G" }), n(57, { letter: "A", octave: 3 })];
		expect(raiseLeadingTones(notes, "Am")[0].midi).toBe(67);
	});

	it("ignores a subtonic not followed by the tonic", () => {
		const notes = [n(67, { letter: "G" }), n(71, { letter: "B" })];
		expect(raiseLeadingTones(notes, "Am")[0].midi).toBe(67);
	});

	it("skips rests to find the resolving tonic", () => {
		const out = raiseLeadingTones(
			[n(67, { letter: "G" }), n(67, { rest: true }), n(69, { letter: "A" })],
			"Am",
		);
		expect(out[0].midi).toBe(68);
	});
});
