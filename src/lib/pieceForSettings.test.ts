import abcjs from "abcjs";
import { describe, expect, it } from "vitest";
import { pieceForSettings } from "./pieceForSettings.ts";
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

	it("reflects the chosen clef and a meter header", () => {
		const abc = pieceForSettings(
			{ ...base, instrumentId: "cello", clef: "bass", grade: 5 },
			2,
		);
		expect(abc).toContain("clef=bass");
		expect(abc).toMatch(/^M:/m);
	});
});
