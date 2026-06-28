import { describe, expect, it } from "vitest";
import type { Note } from "./generateMelody.ts";
import { insertRests, preventFullBarRests } from "./insertRests.ts";
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

describe("preventFullBarRests", () => {
	const note = (rest: boolean): Note => ({
		midi: 60,
		letter: "C",
		accidental: 0,
		octave: 4,
		duration: 8, // a whole bar at barUnits 8
		rest,
	});

	// Group the line into per-bar all-rest flags.
	const barFlags = (notes: Note[], barUnits: number): boolean[] => {
		const flags: boolean[] = [];
		let acc = 0;
		let all = true;
		for (const n of notes) {
			all = all && !!n.rest;
			acc += n.duration;
			if (acc % barUnits === 0) {
				flags.push(all);
				all = true;
			}
		}
		return flags;
	};

	it("un-rests every all-rest bar, including a lone one", () => {
		// bars: note, rest, rest, rest, note
		const input = [
			note(false),
			note(true),
			note(true),
			note(true),
			note(false),
		];
		const flags = barFlags(preventFullBarRests(input, 8), 8);
		expect(flags).toEqual([false, false, false, false, false]); // none silent
	});

	it("restores the bar's pitch when un-resting", () => {
		const input = [note(false), note(true), note(true)];
		const out = preventFullBarRests(input, 8);
		expect(out[2].rest).toBe(false);
		expect(out[2].midi).toBe(60);
	});

	it("only un-rests the first slot of a multi-slot all-rest bar", () => {
		const half = (rest: boolean): Note => ({ ...note(rest), duration: 4 });
		// one bar of two rested quarters at barUnits 8
		const out = preventFullBarRests([half(true), half(true)], 8);
		expect(out[0].rest).toBe(false);
		expect(out[1].rest).toBe(true);
	});
});
