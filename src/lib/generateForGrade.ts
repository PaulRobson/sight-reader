import { generateMelody, type Melody } from "./generateMelody.ts";
import { type Grade, gradeDifficulty } from "./gradeDifficulty.ts";
import { mulberry32 } from "./mulberry32.ts";

// Meters we currently have rhythm cells for. The richer time-signature task
// widens this; until then meter selection collapses to 4/4.
const CELL_METERS = ["4/4"];

type GradeArgs = {
	grade: Grade;
	key: string;
	lowestMidi: number;
	highestMidi: number;
	seed: number;
};

// Derives generator options from the §5 grade table, then generates. stepBias
// is not a §5 column; it falls with grade so higher grades leap more.
export function generateForGrade(
	args: GradeArgs,
): Melody & { tempo: number; timeSignature: string } {
	const p = gradeDifficulty[args.grade];
	const rng = mulberry32(args.seed);
	const bars = p.bars[0] + Math.floor(rng() * (p.bars[1] - p.bars[0] + 1));
	const tempo =
		p.tempoBpm[0] + Math.floor(rng() * (p.tempoBpm[1] - p.tempoBpm[0] + 1));
	const meters = p.timeSignatures.filter((m) => CELL_METERS.includes(m));
	const timeSignature = meters[Math.floor(rng() * meters.length)] ?? "4/4";
	const stepBias = Math.max(0.5, 0.9 - (args.grade - 1) * 0.05);

	const melody = generateMelody({
		seed: args.seed,
		key: args.key,
		bars,
		lowestMidi: args.lowestMidi,
		highestMidi: args.highestMidi,
		stepBias,
		maxLeap: p.maxLeapScaleSteps,
	});
	return { ...melody, tempo, timeSignature };
}
