import type { Melody } from "./generateMelody.ts";
import { generatePhrased, schemeForGrade } from "./generatePhrased.ts";
import { type Grade, gradeDifficulty } from "./gradeDifficulty.ts";
import { insertAccidentals } from "./insertAccidentals.ts";
import { insertRests } from "./insertRests.ts";
import { keys } from "./keys.ts";
import { mulberry32 } from "./mulberry32.ts";
import { rhythm } from "./rhythm.ts";
import { scale } from "./scale.ts";

// Phrases are 4 bars (§4); bar counts snap to a multiple so phrases tile evenly.
const PHRASE_BARS = 4;

type GradeArgs = {
	grade: Grade;
	key?: string; // explicit written key; derived within the grade's breadth if absent
	lowestMidi: number;
	highestMidi: number;
	seed: number;
};

// Snap a raw bar count to a whole number of phrases. Every grade's min/max are
// multiples of PHRASE_BARS, so the result stays inside the grade's range.
function snapBars(raw: number): number {
	return Math.max(PHRASE_BARS, Math.round(raw / PHRASE_BARS) * PHRASE_BARS);
}

// Derives generator options from the §5 grade table, then generates. stepBias
// is not a §5 column; it falls with grade so higher grades leap more.
export function generateForGrade(
	args: GradeArgs,
): Melody & { tempo: number; timeSignature: string } {
	const p = gradeDifficulty[args.grade];
	const rng = mulberry32(args.seed);
	const bars = snapBars(
		p.bars[0] + Math.floor(rng() * (p.bars[1] - p.bars[0] + 1)),
	);
	const tempo =
		p.tempoBpm[0] + Math.floor(rng() * (p.tempoBpm[1] - p.tempoBpm[0] + 1));
	const timeSignature =
		p.timeSignatures[Math.floor(rng() * p.timeSignatures.length)];
	const meter = rhythm.restrict(
		rhythm.meters[timeSignature],
		p.shortestNoteSixteenths,
	);
	const stepBias = Math.max(0.5, 0.9 - (args.grade - 1) * 0.05);
	const key = args.key ?? keys.pick(p.maxKeyAccidentals, rng);

	const { melody } = generatePhrased({
		seed: args.seed,
		key,
		bars,
		lowestMidi: args.lowestMidi,
		highestMidi: args.highestMidi,
		stepBias,
		maxLeap: p.maxLeapScaleSteps,
		scheme: schemeForGrade(args.grade),
		phraseBars: PHRASE_BARS,
		meter,
	});
	const rested = insertRests(melody.notes, p.restProbability, rng);
	const scalePitchClasses = new Set(scale.major(key).map((d) => d.pitchClass));
	const notes = insertAccidentals(
		rested,
		p.accidentals,
		{
			scalePitchClasses,
			lowestMidi: args.lowestMidi,
			highestMidi: args.highestMidi,
		},
		rng,
	);
	return { ...melody, notes, tempo, timeSignature };
}
