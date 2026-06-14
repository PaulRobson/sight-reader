import { type GeneratorOptions, generateMelody } from "./generateMelody.ts";
import { toAbc } from "./toAbc.ts";

// Hardcoded thin-path target: Piano, treble, grade 1, 4/4, C major, 4 bars.
const GRADE1: GeneratorOptions = {
	seed: 1,
	key: "C",
	bars: 4,
	lowestMidi: 60, // C4
	highestMidi: 84, // C6
	stepBias: 0.85,
	maxLeap: 2,
};

export function defaultPiece(): string {
	return toAbc(generateMelody(GRADE1), {
		program: 0,
		clef: "treble",
		tempo: 70,
	});
}
