import { type GeneratorOptions, generateMelody } from "./generateMelody.ts";
import { rhythm } from "./rhythm.ts";
import { toAbc } from "./toAbc.ts";

// Hardcoded thin-path target: Piano, treble, grade 1, 4/4, C major, 4 bars.
// Grade-1 rhythm: quarter is the shortest note (restrict drops finer cells).
const GRADE1: GeneratorOptions = {
	seed: 1,
	key: "C",
	bars: 4,
	lowestMidi: 60, // C4
	highestMidi: 84, // C6
	stepBias: 0.85,
	maxLeap: 2,
	meter: rhythm.restrict(rhythm.meters["4/4"], 4),
};

export function defaultPiece(seed = GRADE1.seed): string {
	return toAbc(generateMelody({ ...GRADE1, seed }), {
		program: 0,
		clef: "treble",
		tempo: 70,
	});
}
