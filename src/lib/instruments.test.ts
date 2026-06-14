import { describe, expect, it } from "vitest";
import { instruments } from "./instruments.ts";

const PC: Record<string, number> = {
	C: 0,
	D: 2,
	E: 4,
	F: 5,
	G: 7,
	A: 9,
	B: 11,
};

// Returns MIDI for valid SPN (e.g. "F#3", "Bb4", "C8"), or null if malformed.
function spnToMidi(spn: string): number | null {
	const m = /^([A-G])(#+|b+)?(-?\d)$/.exec(spn);
	if (!m) return null;
	const [, letter, acc, octave] = m;
	const alter = acc ? (acc[0] === "#" ? acc.length : -acc.length) : 0;
	return 12 * (Number(octave) + 1) + PC[letter] + alter;
}

const EXPECTED_NAMES = [
	"Trombone",
	"Cello",
	"Piano",
	"Flute",
	"Violin",
	"Clarinet in B♭",
	"Trumpet in B♭",
	"Alto Sax (E♭)",
	"Guitar",
];

describe("instruments table", () => {
	it("lists every §6 instrument in order", () => {
		expect(instruments.map((i) => i.name)).toEqual(EXPECTED_NAMES);
	});

	it("has unique ids", () => {
		const ids = instruments.map((i) => i.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("parses both range bounds as valid SPN with low < high", () => {
		for (const i of instruments) {
			const low = spnToMidi(i.lowestWrittenNote);
			const high = spnToMidi(i.highestWrittenNote);
			expect(low, i.id).not.toBeNull();
			expect(high, i.id).not.toBeNull();
			expect((low as number) < (high as number), i.id).toBe(true);
		}
	});

	it("has a numeric transposition offset and a valid GM program", () => {
		for (const i of instruments) {
			expect(typeof i.soundingOffsetSemitones, i.id).toBe("number");
			expect(Number.isInteger(i.gmProgram), i.id).toBe(true);
			expect(i.gmProgram >= 0 && i.gmProgram <= 127, i.id).toBe(true);
		}
	});

	it("has a non-empty clef list containing its default clef", () => {
		for (const i of instruments) {
			expect(i.clefs.length, i.id).toBeGreaterThan(0);
			expect(i.clefs, i.id).toContain(i.defaultClef);
		}
	});

	it("matches the §6 transposition offsets", () => {
		const offset = (id: string) =>
			instruments.find((i) => i.id === id)?.soundingOffsetSemitones;
		expect(offset("piano")).toBe(0);
		expect(offset("bflat-clarinet")).toBe(-2);
		expect(offset("bflat-trumpet")).toBe(-2);
		expect(offset("alto-sax")).toBe(-9);
		expect(offset("guitar")).toBe(-12);
	});
});
