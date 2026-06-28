import type { GradeParams } from "./gradeDifficulty.ts";
import type { Prng } from "./mulberry32.ts";
import { type Meter, rhythm } from "./rhythm.ts";

export type GradeRhythmPlan = {
	bars: number;
	tempo: number;
	timeSignature: string;
	meter: Meter;
};

// The grade's bar count, tempo, time signature and (shortest-note-restricted)
// meter, drawn in a fixed rng order so callers stay deterministic. Shared by the
// melodic and rhythm-only generators.
export function gradeRhythmPlan(p: GradeParams, rng: Prng): GradeRhythmPlan {
	const bars = p.bars[0] + Math.floor(rng() * (p.bars[1] - p.bars[0] + 1));
	const tempo =
		p.tempoBpm[0] + Math.floor(rng() * (p.tempoBpm[1] - p.tempoBpm[0] + 1));
	const timeSignature =
		p.timeSignatures[Math.floor(rng() * p.timeSignatures.length)];
	const meter = rhythm.restrict(
		rhythm.meters[timeSignature],
		p.shortestNoteSixteenths,
	);
	return { bars, tempo, timeSignature, meter };
}
