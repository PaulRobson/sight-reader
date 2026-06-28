import { type Melody, type Note, toNotes } from "./generateMelody.ts";
import { mulberry32 } from "./mulberry32.ts";
import {
	finalizeCadence,
	type GeneratorOptions,
	limitFastLeaps,
	type Pitch,
	pitchSpace,
} from "./pitchWalk.ts";
import {
	interiorPhraseEnds,
	type PhraseScheme,
	type PhraseSpan,
	planPhrases,
} from "./planPhrases.ts";
import { realizeSpans, snapInterior } from "./realizeSpans.ts";
import { rhythm } from "./rhythm.ts";

export type { PhraseScheme } from "./planPhrases.ts";
export { schemeForGrade } from "./planPhrases.ts";

export type PhrasedOptions = GeneratorOptions & {
	scheme: PhraseScheme;
	phraseBars: number;
};

export type PhrasedResult = {
	melody: Melody;
	phrases: PhraseSpan[];
	scheme: PhraseScheme;
};

// Widest playable leap (semitones) into a note after a 16th/32nd; wider ones get
// pulled in. A later accidental can still shift a note ±1.
const MAX_FAST_LEAP_SEMITONES = 5;

function toMelody(
	opts: PhrasedOptions,
	pitches: Pitch[],
	indices: number[],
	durations: number[],
	barUnits: number,
): Melody {
	const notes: Note[] = toNotes(
		indices.map((i) => pitches[i]),
		durations,
	);
	return { key: opts.key, bars: opts.bars, barUnits, notes };
}

export function generatePhrased(opts: PhrasedOptions): PhrasedResult {
	const rng = mulberry32(opts.seed);
	const meter = opts.meter ?? rhythm.meters["4/4"];
	const { pitches, tonics, start, cadenceTargets } = pitchSpace(opts);
	const len = pitches.length;
	const n = Math.max(1, Math.round(opts.bars / opts.phraseBars));

	const spans = planPhrases({
		opts,
		scheme: opts.scheme,
		phraseBars: opts.phraseBars,
		meter,
		n,
		start,
		len,
		rng,
	});

	const cadence = { targets: cadenceTargets, maxLeap: opts.maxLeap };
	const indices = realizeSpans(spans, start, len, cadence);
	const durations = spans.flatMap((s) => s.durations);
	const ends = interiorPhraseEnds(spans);
	const max = MAX_FAST_LEAP_SEMITONES;
	limitFastLeaps(indices, durations, pitches, max);
	// re-place cadences beside their limited approach note, then limit again with
	// the cadences pinned so a fast cadence note can't leap into the next phrase.
	for (const e of ends) indices[e] = snapInterior(indices[e - 1], cadence);
	finalizeCadence(indices, tonics);
	const pinned = new Set(ends).add(indices.length - 1).add(indices.length - 2);
	limitFastLeaps(indices, durations, pitches, max, pinned);
	return {
		melody: toMelody(opts, pitches, indices, durations, meter.barUnits),
		phrases: spans,
		scheme: opts.scheme,
	};
}
