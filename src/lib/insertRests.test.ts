import { describe, expect, it } from "vitest";
import type { Note } from "./generateMelody.ts";
import { insertRests } from "./insertRests.ts";
import { mulberry32 } from "./mulberry32.ts";

const makeNotes = (count: number): Note[] =>
	Array.from({ length: count }, (_, i) => ({
		midi: 60 + i,
		letter: "C",
		accidental: 0,
		octave: 4,
		duration: 4,
	}));

describe("insertRests", () => {
	it("inserts no rests at probability 0", () => {
		const out = insertRests(makeNotes(16), 0, mulberry32(1));
		expect(out.some((n) => n.rest)).toBe(false);
	});

	it("rests every interior slot at probability 1, keeping the ends pitched", () => {
		const out = insertRests(makeNotes(16), 1, mulberry32(1));
		expect(out[0].rest).toBeFalsy();
		expect(out[out.length - 1].rest).toBeFalsy();
		for (let i = 1; i < out.length - 1; i++) expect(out[i].rest).toBe(true);
	});

	it("preserves duration and the underlying pitch on rested slots", () => {
		const input = makeNotes(16);
		const out = insertRests(input, 1, mulberry32(1));
		out.forEach((n, i) => {
			expect(n.duration).toBe(input[i].duration);
			expect(n.midi).toBe(input[i].midi);
		});
	});

	it("is deterministic for the same seed and diverges for another", () => {
		const a = insertRests(makeNotes(40), 0.4, mulberry32(7)).map(
			(n) => !!n.rest,
		);
		const b = insertRests(makeNotes(40), 0.4, mulberry32(7)).map(
			(n) => !!n.rest,
		);
		const c = insertRests(makeNotes(40), 0.4, mulberry32(8)).map(
			(n) => !!n.rest,
		);
		expect(a).toEqual(b);
		expect(a).not.toEqual(c);
	});

	it("approximates the requested rest proportion over many slots", () => {
		const notes = makeNotes(400);
		const rests = insertRests(notes, 0.3, mulberry32(3)).filter(
			(n) => n.rest,
		).length;
		const interior = notes.length - 2;
		expect(rests / interior).toBeGreaterThan(0.2);
		expect(rests / interior).toBeLessThan(0.4);
	});

	it("never rests the only interior-free pieces' endpoints", () => {
		const out = insertRests(makeNotes(2), 1, mulberry32(1));
		expect(out.some((n) => n.rest)).toBe(false); // both notes are endpoints
	});
});
