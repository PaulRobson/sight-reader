import { buildIndices, type GeneratorOptions, stepDelta } from "./pitchWalk.ts";
import { type Meter, rhythm } from "./rhythm.ts";

// §4 step 4: phrase-level repetition is what makes output sound musical.
//  - AABA: literal repetition of one phrase with a contrasting penultimate one.
//  - sequence: the same contour transposed by a step each phrase.
//  - vary: the same rhythm re-pitched each phrase.
// Repetition is of contour (relative shape), not absolute pitch: phrases join
// continuously so every melodic interval stays within the grade's maxLeap.
export type PhraseScheme = "AABA" | "sequence" | "vary";

// One phrase's material. `connector` is the move from the previous phrase's
// last note into this phrase's first note (null for the opening phrase).
// `deltas` are the within-phrase moves; together they total `durations.length`.
export type PhraseSpan = {
	durations: number[];
	connector: number | null;
	deltas: number[];
};

type Contour = { durations: number[]; deltas: number[] };

export type PlanArgs = {
	opts: GeneratorOptions;
	scheme: PhraseScheme;
	phraseBars: number;
	meter: Meter;
	n: number;
	start: number;
	len: number;
	rng: () => number;
};

function diffs(indices: number[]): number[] {
	return indices.slice(1).map((v, i) => v - indices[i]);
}

// A fresh phrase contour: its rhythm and the within-phrase moves.
function freshContour(args: PlanArgs): Contour {
	const durations = rhythm.drawBars(args.meter, args.phraseBars, args.rng);
	const indices = buildIndices(
		durations.length,
		args.start,
		args.opts,
		args.len,
		args.rng,
	);
	return { durations, deltas: diffs(indices) };
}

// Phrase 0 anchors the contour; each later phrase comes from `makeSpan`.
function buildSpans(
	a: Contour,
	n: number,
	makeSpan: (i: number) => PhraseSpan,
): PhraseSpan[] {
	const spans: PhraseSpan[] = [{ ...a, connector: null }];
	for (let i = 1; i < n; i++) spans.push(makeSpan(i));
	return spans;
}

function planSequence(a: Contour, args: PlanArgs): PhraseSpan[] {
	const dir = args.rng() < 0.5 ? -1 : 1; // transpose the contour by a step
	return buildSpans(a, args.n, () => ({ ...a, connector: dir }));
}

function planVary(a: Contour, args: PlanArgs): PhraseSpan[] {
	return buildSpans(a, args.n, () => {
		// Same rhythm, re-derived pitches.
		const indices = buildIndices(
			a.durations.length,
			args.start,
			args.opts,
			args.len,
			args.rng,
		);
		return {
			durations: a.durations,
			connector: stepDelta(args.opts, args.rng),
			deltas: diffs(indices),
		};
	});
}

// A contrasting B in the penultimate slot, A everywhere else.
function planAABA(a: Contour, args: PlanArgs): PhraseSpan[] {
	return buildSpans(a, args.n, (i) =>
		i === args.n - 2 && args.n >= 3
			? { ...freshContour(args), connector: stepDelta(args.opts, args.rng) }
			: { ...a, connector: stepDelta(args.opts, args.rng) },
	);
}

// The opening phrase plus its scheme-driven repetitions/sequences.
export function planPhrases(args: PlanArgs): PhraseSpan[] {
	const a = freshContour(args);
	if (args.scheme === "sequence") return planSequence(a, args);
	if (args.scheme === "vary") return planVary(a, args);
	return planAABA(a, args);
}
