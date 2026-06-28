import type { GradeParams } from "./gradeDifficulty.ts";
import type { Prng } from "./mulberry32.ts";
import { type Meter, type RhythmCell, rhythm } from "./rhythm.ts";

export type GradeRhythmPlan = {
	bars: number;
	tempo: number;
	timeSignature: string;
	meter: Meter;
};

// Scale the draw weight of the cells a predicate selects, leaving the rest
// untouched, so a grade can bias the rhythmic vocabulary toward or away from them.
function scaleCells(
	meter: Meter,
	factor: number,
	match: (c: RhythmCell) => boolean,
): Meter {
	if (factor === 1) return meter;
	return {
		...meter,
		cells: meter.cells.map((c) =>
			match(c) ? { ...c, weight: c.weight * factor } : c,
		),
	};
}

const isFine = (c: RhythmCell) => Math.min(...c.durations) < 1; // has a 32nd
const isCoarse = (c: RhythmCell) => Math.min(...c.durations) >= 4; // no 8th or finer

// The grade's bar count, tempo, time signature and (shortest-note-restricted)
// meter, drawn in a fixed rng order so callers stay deterministic. Shared by the
// melodic and rhythm-only generators.
export function gradeRhythmPlan(p: GradeParams, rng: Prng): GradeRhythmPlan {
	const bars = p.bars[0] + Math.floor(rng() * (p.bars[1] - p.bars[0] + 1));
	const tempo =
		p.tempoBpm[0] + Math.floor(rng() * (p.tempoBpm[1] - p.tempoBpm[0] + 1));
	const timeSignature =
		p.timeSignatures[Math.floor(rng() * p.timeSignatures.length)];
	const restricted = rhythm.restrict(
		rhythm.meters[timeSignature],
		p.shortestNoteSixteenths,
	);
	const fined = scaleCells(restricted, p.fineNoteWeight ?? 1, isFine);
	const meter = scaleCells(fined, p.coarseNoteWeight ?? 1, isCoarse);
	return { bars, tempo, timeSignature, meter };
}
