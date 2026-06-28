import type { Melody, Note } from "./generateMelody.ts";
import { type Grade, gradeDifficulty } from "./gradeDifficulty.ts";
import { gradeRhythmPlan } from "./gradeRhythmPlan.ts";
import { mulberry32 } from "./mulberry32.ts";
import { rhythm } from "./rhythm.ts";

// B4 sits exactly on the single percussion-clef staff line (abcjs perc pitch 6),
// so every rhythm slot reads as one notehead on the line, no pitch to decode.
const FIXED_PITCH = { midi: 71, letter: "B", accidental: 0, octave: 4 };

// Woodblock (GM 116, 0-based 115 — abcjs "woodblock" sample). A near-pitchless
// percussion click for the reference, so rhythm-only plays rhythm without pitch
// (§8), not the melodic instrument's timbre.
export const RHYTHM_GM_PROGRAM = 115;

// Rhythm-only mode (§8): reuse the grade's rhythm-cell draw, skip pitch
// assignment, fix every note to one pitch. Key is C (no signature to read) and
// no dynamics/articulation/accidentals — those are melodic concerns.
export function generateRhythm(args: { grade: Grade; seed: number }): Melody & {
	tempo: number;
	timeSignature: string;
} {
	const p = gradeDifficulty[args.grade];
	const rng = mulberry32(args.seed);
	const { bars, tempo, timeSignature, meter } = gradeRhythmPlan(p, rng);
	const durations = rhythm.drawBars(meter, bars, rng);
	const notes: Note[] = durations.map((duration) => ({
		...FIXED_PITCH,
		duration,
	}));
	return {
		key: "C",
		bars,
		barUnits: meter.barUnits,
		notes,
		tempo,
		timeSignature,
	};
}
