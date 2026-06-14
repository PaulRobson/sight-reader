import { type Melody, type Note, toNotes } from "./generateMelody.ts";
import type { Grade } from "./gradeDifficulty.ts";
import { mulberry32 } from "./mulberry32.ts";
import {
	clampIndex,
	finalizeCadence,
	type GeneratorOptions,
	nearest,
	type Pitch,
	pitchSpace,
} from "./pitchWalk.ts";
import {
	type PhraseScheme,
	type PhraseSpan,
	planPhrases,
} from "./planPhrases.ts";
import { rhythm } from "./rhythm.ts";

export type { PhraseScheme } from "./planPhrases.ts";

// Lower grades get the most literal repetition; transposition then free
// variation come in higher up (§4 step 4: simpler repetition at low grades).
export function schemeForGrade(grade: Grade): PhraseScheme {
	if (grade <= 2) return "AABA";
	if (grade <= 5) return "sequence";
	return "vary";
}

export type PhrasedOptions = GeneratorOptions & {
	scheme: PhraseScheme;
	phraseBars: number;
};

export type PhrasedResult = {
	melody: Melody;
	phrases: PhraseSpan[];
	scheme: PhraseScheme;
};

type Cadence = { targets: number[]; maxLeap: number };

// Snap an interior phrase's last note to the nearest degree-2/5 within reach,
// for a half-cadence feel that still respects the maxLeap bound (§4 rule 7).
function snapInterior(prev: number, cadence: Cadence): number {
	if (cadence.targets.length === 0) return prev;
	const cand = nearest(cadence.targets, prev);
	return Math.abs(cand - prev) <= cadence.maxLeap ? cand : prev;
}

// Realize phrase spans into a continuous index walk from the anchor, clamping
// into range so reused/transposed contours never escape the instrument.
// Interior phrases land on degree 2 or 5; the final phrase resolves to degree 1
// via finalizeCadence.
function realize(
	spans: PhraseSpan[],
	start: number,
	len: number,
	cadence: Cadence,
): number[] {
	const indices: number[] = [];
	let running = start;
	spans.forEach((span, si) => {
		running =
			span.connector === null
				? start
				: clampIndex(running + span.connector, len);
		indices.push(running);
		for (const d of span.deltas) {
			running = clampIndex(running + d, len);
			indices.push(running);
		}
		if (si < spans.length - 1 && span.deltas.length >= 1) {
			running = snapInterior(indices[indices.length - 2], cadence);
			indices[indices.length - 1] = running;
		}
	});
	return indices;
}

function toMelody(
	opts: PhrasedOptions,
	pitches: Pitch[],
	indices: number[],
	durations: number[],
): Melody {
	const notes: Note[] = toNotes(
		indices.map((i) => pitches[i]),
		durations,
	);
	return {
		key: opts.key,
		bars: opts.bars,
		barUnits: rhythm.barUnits4x4,
		notes,
	};
}

export function generatePhrased(opts: PhrasedOptions): PhrasedResult {
	const rng = mulberry32(opts.seed);
	const { pitches, tonics, start, cadenceTargets } = pitchSpace(opts);
	const len = pitches.length;
	const n = Math.max(1, Math.round(opts.bars / opts.phraseBars));

	const spans = planPhrases({
		opts,
		scheme: opts.scheme,
		phraseBars: opts.phraseBars,
		n,
		start,
		len,
		rng,
	});

	const indices = realize(spans, start, len, {
		targets: cadenceTargets,
		maxLeap: opts.maxLeap,
	});
	finalizeCadence(indices, tonics);
	const durations = spans.flatMap((s) => s.durations);
	return {
		melody: toMelody(opts, pitches, indices, durations),
		phrases: spans,
		scheme: opts.scheme,
	};
}
