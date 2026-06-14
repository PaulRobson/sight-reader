import { describe, expect, it } from "vitest";
import {
	type GeneratorOptions,
	generateMelody,
	type Melody,
	type Note,
} from "./generateMelody.ts";

const grade1: GeneratorOptions = {
	seed: 42,
	key: "C",
	bars: 4,
	lowestMidi: 60, // C4
	highestMidi: 84, // C6
	stepBias: 0.85,
	maxLeap: 2, // up to a 3rd
};

describe("generateMelody", () => {
	it("is deterministic for the same seed", () => {
		const a: Melody = generateMelody(grade1);
		const b: Melody = generateMelody(grade1);
		expect(a).toEqual(b);
	});

	it("diverges for different seeds", () => {
		const a = generateMelody(grade1).notes.map((n) => n.midi);
		const b = generateMelody({ ...grade1, seed: 43 }).notes.map((n) => n.midi);
		expect(a).not.toEqual(b);
	});

	it("starts on the tonic", () => {
		const first = generateMelody(grade1).notes[0];
		expect(first.letter).toBe("C");
		expect(first.accidental).toBe(0);
		expect(first.midi % 12).toBe(0);
	});

	it("ends on the tonic approached by step", () => {
		const notes = generateMelody(grade1).notes;
		const last = notes[notes.length - 1];
		const penult = notes[notes.length - 2];
		expect(last.midi % 12).toBe(0); // C
		const step = Math.abs(last.midi - penult.midi);
		expect(step).toBeGreaterThanOrEqual(1);
		expect(step).toBeLessThanOrEqual(2); // diatonic second
	});

	it("keeps every note inside the range", () => {
		const notes: Note[] = generateMelody(grade1).notes;
		for (const note of notes) {
			expect(note.midi).toBeGreaterThanOrEqual(grade1.lowestMidi);
			expect(note.midi).toBeLessThanOrEqual(grade1.highestMidi);
		}
	});

	it("fills exactly the requested number of bars", () => {
		const m = generateMelody(grade1);
		const total = m.notes.reduce((s, note) => s + note.duration, 0);
		expect(total).toBe(grade1.bars * m.barUnits);
	});

	it("is stepwise-biased on average", () => {
		let steps = 0;
		let total = 0;
		for (let seed = 1; seed <= 30; seed++) {
			const notes = generateMelody({ ...grade1, seed }).notes;
			for (let i = 1; i < notes.length; i++) {
				total++;
				if (Math.abs(notes[i].midi - notes[i - 1].midi) <= 2) steps++;
			}
		}
		expect(steps / total).toBeGreaterThan(0.6);
	});
});
