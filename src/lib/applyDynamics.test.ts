import abcjs from "abcjs";
import { describe, expect, it } from "vitest";
import { applyDynamics } from "./applyDynamics.ts";
import { generateForGrade } from "./generateForGrade.ts";
import type { Note } from "./generateMelody.ts";
import { type Grade, gradeDifficulty } from "./gradeDifficulty.ts";
import { mulberry32 } from "./mulberry32.ts";
import { toAbc } from "./toAbc.ts";

const note = (over: Partial<Note> = {}): Note => ({
	midi: 60,
	letter: "C",
	accidental: 0,
	octave: 4,
	duration: 4,
	...over,
});

const line = (n: number): Note[] => Array.from({ length: n }, () => note());
const decosOf = (notes: Note[]) => notes.flatMap((x) => x.decorations ?? []);

describe("applyDynamics", () => {
	it("marks the first sounding note of each phrase with a vocab word", () => {
		const notes = line(16);
		const starts = [0, 4, 8, 12];
		const out = applyDynamics(notes, starts, ["f", "p"], 16, mulberry32(1));
		for (const s of starts) {
			expect(out[s].decorations).toHaveLength(1);
			expect(["f", "p"]).toContain(out[s].decorations?.[0]);
		}
	});

	it("emits no hairpins when the grade has none", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const out = applyDynamics(
				line(16),
				[0, 4, 8, 12],
				["p", "f"],
				16,
				mulberry32(seed),
			);
			expect(decosOf(out).some((d) => d.includes("crescendo"))).toBe(false);
			expect(decosOf(out).some((d) => d.includes("diminuendo"))).toBe(false);
		}
	});

	it("opens and closes every hairpin, and never opens one on the first phrase", () => {
		let sawHairpin = false;
		for (let seed = 1; seed <= 40; seed++) {
			const out = applyDynamics(
				line(16),
				[0, 4, 8, 12],
				["p", "mf", "f", "cresc", "dim"],
				16,
				mulberry32(seed),
			);
			const decos = decosOf(out);
			const opens = decos.filter((d) => d.endsWith("(")).length;
			const closes = decos.filter((d) => d.endsWith(")")).length;
			expect(opens).toBe(closes);
			if (opens > 0) sawHairpin = true;
			// phrase 0 (notes 0..3) carries a static level, no hairpin open
			expect(out.slice(0, 4).flatMap((x) => x.decorations ?? [])).not.toContain(
				"crescendo(",
			);
		}
		expect(sawHairpin).toBe(true);
	});

	it("caps a hairpin at two bars and states its destination level", () => {
		const barUnits = 16; // 4/4, sixteenth units
		const notes = line(64); // duration-4 notes => 4 per bar, 16 bars
		const starts = [0, 16, 32, 48]; // four 4-bar phrases
		const levels = ["pp", "p", "mp", "mf", "f", "ff"];
		let sawHairpin = false;
		for (let seed = 1; seed <= 80; seed++) {
			const out = applyDynamics(
				notes,
				starts,
				["p", "mp", "mf", "f", "cresc", "dim"],
				barUnits,
				mulberry32(seed),
			);
			for (const kind of ["crescendo", "diminuendo"]) {
				const opens = out.flatMap((x, i) =>
					(x.decorations ?? []).includes(`${kind}(`) ? [i] : [],
				);
				const closes = out.flatMap((x, i) =>
					(x.decorations ?? []).includes(`${kind})`) ? [i] : [],
				);
				expect(opens.length).toBe(closes.length);
				for (let k = 0; k < opens.length; k++) {
					sawHairpin = true;
					expect(closes[k]).toBeGreaterThan(opens[k]);
					const span = out
						.slice(opens[k], closes[k] + 1)
						.reduce((s, x) => s + x.duration, 0);
					expect(span).toBeLessThanOrEqual(2 * barUnits);
					const dest = (out[closes[k]].decorations ?? []).filter((d) =>
						levels.includes(d),
					);
					expect(dest).toHaveLength(1); // a stated destination level
				}
			}
		}
		expect(sawHairpin).toBe(true);
	});

	it("skips an all-rest phrase", () => {
		const notes = line(8).map((n, i) => (i < 4 ? { ...n, rest: true } : n));
		const out = applyDynamics(notes, [0, 4], ["f", "p"], 16, mulberry32(1));
		expect(out.slice(0, 4).flatMap((x) => x.decorations ?? [])).toHaveLength(0);
		expect(decosOf(out.slice(4))).not.toHaveLength(0);
	});

	it("anchors to the first sounding note when a phrase opens on a rest", () => {
		const notes = line(4).map((n, i) => (i === 0 ? { ...n, rest: true } : n));
		const out = applyDynamics(notes, [0], ["f"], 16, mulberry32(1));
		expect(out[0].decorations ?? []).toHaveLength(0);
		expect(out[1].decorations).toEqual(["f"]);
	});

	it("is deterministic for the same inputs", () => {
		const a = applyDynamics(
			line(16),
			[0, 4, 8, 12],
			["p", "f", "cresc"],
			16,
			mulberry32(9),
		);
		const b = applyDynamics(
			line(16),
			[0, 4, 8, 12],
			["p", "f", "cresc"],
			16,
			mulberry32(9),
		);
		expect(a).toEqual(b);
	});
});

describe("generateForGrade dynamics", () => {
	const GRADES: Grade[] = [1, 4, 8];
	it("places grade-appropriate dynamics that serialise and parse cleanly", () => {
		for (const grade of GRADES) {
			const vocab = new Set(gradeDifficulty[grade].dynamics);
			for (let seed = 1; seed <= 5; seed++) {
				const m = generateForGrade({
					grade,
					key: "C",
					lowestMidi: 55,
					highestMidi: 79,
					seed,
				});
				const decos = decosOf(m.notes);
				expect(decos.length).toBeGreaterThan(0);
				// grade 1 has no hairpins in its vocabulary
				if (!vocab.has("cresc"))
					expect(decos.some((d) => d.includes("crescendo"))).toBe(false);
				const abc = toAbc(m, { tempo: m.tempo, meter: m.timeSignature });
				expect(abc).toContain(`!${decos[0]}!`); // serializer wraps the token
				expect(abcjs.parseOnly(abc)[0].warnings).toBeUndefined();
			}
		}
	});
});
