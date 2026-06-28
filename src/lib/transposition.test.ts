import { describe, expect, it } from "vitest";
import { instruments } from "./instruments.ts";
import { transposition } from "./transposition.ts";

const { soundingMidi, synthMidiTranspose } = transposition;

// Written notes as MIDI: C4 = 60, A4 = 69, E4 = 64.
const C4 = 60;
const A4 = 69;
const E4 = 64;

describe("soundingMidi", () => {
	it("adds the offset to the written pitch", () => {
		expect(soundingMidi(C4, 0)).toBe(60);
		expect(soundingMidi(C4, -2)).toBe(58);
		expect(soundingMidi(A4, -9)).toBe(60);
	});

	it("is the identity for concert-pitch instruments", () => {
		expect(soundingMidi(C4, 0)).toBe(C4);
		expect(soundingMidi(A4, 0)).toBe(A4);
	});

	// §6 transposition table: written note + offset -> sounding (concert) pitch.
	it.each([
		["concert (piano/flute/violin/cello/oboe)", 0, A4, 69], // A4 -> A4
		["B♭ (clarinet/trumpet/soprano sax)", -2, C4, 58], // C4 -> B♭3
		["E♭ alto sax", -9, A4, 60], // A4 -> C4
		["horn in F", -7, C4, 53], // C4 -> F3
		["guitar / bass / double bass", -12, E4, 52], // E4 -> E3 (octave down)
		["tenor sax", -14, C4, 46], // C4 -> B♭2 (octave + M2 down)
		["piccolo", 12, C4, 72], // C4 -> C5 (octave up)
	])("transposes %s correctly", (_label, offset, written, sounding) => {
		expect(soundingMidi(written, offset)).toBe(sounding);
	});
});

describe("synthMidiTranspose", () => {
	it("equals each modelled instrument's offset", () => {
		for (const instrument of instruments) {
			expect(synthMidiTranspose(instrument), instrument.id).toBe(
				instrument.soundingOffsetSemitones,
			);
		}
	});

	// The offset the synth applies, verified by reconstructing the sounding pitch
	// of a written note for every §6 instrument we model.
	it.each([
		["trombone", A4, 69],
		["cello", A4, 69],
		["piano", A4, 69],
		["flute", A4, 69],
		["violin", A4, 69],
		["bflat-clarinet", C4, 58], // written C sounds concert B♭
		["bflat-trumpet", C4, 58],
		["alto-sax", A4, 60],
		["guitar", E4, 52],
	])("sounds %s's written note at the right pitch", (id, written, sounding) => {
		const instrument = instruments.find((i) => i.id === id);
		if (!instrument) throw new Error(`missing instrument: ${id}`);
		expect(soundingMidi(written, synthMidiTranspose(instrument))).toBe(
			sounding,
		);
	});
});
