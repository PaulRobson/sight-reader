import abcjs from "abcjs";
import { describe, expect, it } from "vitest";
import type { Grade } from "./gradeDifficulty.ts";
import { findInstrument } from "./instruments.ts";
import { comfortableRange, pieceForSettings } from "./pieceForSettings.ts";
import type { Settings } from "./useSettings.ts";

const base: Settings = {
	instrumentId: "piano",
	clef: "treble",
	grade: 3,
	mode: "melodic",
	countdownSeconds: 60,
	metronomeOnAttempt: true,
	referenceAvailableBeforeAttempt: false,
};

describe("pieceForSettings", () => {
	it("produces abc that parses cleanly across grades and instruments", () => {
		for (const instrumentId of ["piano", "flute", "bflat-clarinet", "guitar"]) {
			for (const grade of [3, 5, 8]) {
				for (let seed = 1; seed <= 5; seed++) {
					const abc = pieceForSettings({ ...base, instrumentId, grade }, seed);
					const tunes = abcjs.parseOnly(abc);
					expect(
						tunes[0].warnings,
						`${instrumentId} g${grade} s${seed}`,
					).toBeUndefined();
				}
			}
		}
	});

	it("is deterministic for the same settings and seed", () => {
		expect(pieceForSettings(base, 7)).toBe(pieceForSettings(base, 7));
	});

	it("keeps the comfortable range inside the instrument and widening with grade", () => {
		const CELLO_LOW = 36; // C2
		const CELLO_HIGH = 84; // C6
		const center = 50; // D3, bass staff middle
		const g3 = comfortableRange(center, 3 as Grade, CELLO_LOW, CELLO_HIGH);
		const g8 = comfortableRange(center, 8 as Grade, CELLO_LOW, CELLO_HIGH);
		// never exceeds the instrument bounds
		expect(g3.lowestMidi).toBeGreaterThanOrEqual(CELLO_LOW);
		expect(g8.highestMidi).toBeLessThanOrEqual(CELLO_HIGH);
		// a grade-5 cello exercise stays well below the expert region (A5 = 81)
		const g5 = comfortableRange(center, 5 as Grade, CELLO_LOW, CELLO_HIGH);
		expect(g5.highestMidi).toBeLessThan(81);
		// higher grades use a wider band
		expect(g8.highestMidi - g8.lowestMidi).toBeGreaterThan(
			g3.highestMidi - g3.lowestMidi,
		);
	});

	it("renders piano as a grand staff", () => {
		const abc = pieceForSettings(
			{ ...base, instrumentId: "piano", grade: 3 },
			1,
		);
		expect(abc).toContain("%%score {1 2}");
		expect(abc).toContain("V:1 clef=treble");
		expect(abc).toContain("V:2 clef=bass");
	});

	it("emits the instrument's GM program for the synth timbre", () => {
		for (const instrumentId of ["flute", "cello", "bflat-clarinet", "guitar"]) {
			const abc = pieceForSettings({ ...base, instrumentId }, 3);
			expect(abc).toContain(
				`%%MIDI program ${findInstrument(instrumentId).gmProgram}`,
			);
		}
	});

	it("reflects the chosen clef and a meter header", () => {
		const abc = pieceForSettings(
			{ ...base, instrumentId: "cello", clef: "bass", grade: 5 },
			2,
		);
		expect(abc).toContain("clef=bass");
		expect(abc).toMatch(/^M:/m);
	});
});
