import { clampIndex, nearest } from "./pitchWalk.ts";
import type { PhraseSpan } from "./planPhrases.ts";

export type Cadence = { targets: number[]; maxLeap: number };

// Snap an interior phrase's last note to the nearest degree-2/5 within reach,
// for a half-cadence feel that still respects the maxLeap bound (§4 rule 7).
export function snapInterior(prev: number, cadence: Cadence): number {
	if (cadence.targets.length === 0) return prev;
	const cand = nearest(cadence.targets, prev);
	return Math.abs(cand - prev) <= cadence.maxLeap ? cand : prev;
}

// Realize phrase spans into a continuous index walk from the anchor, clamping
// into range so reused/transposed contours never escape the instrument. Interior
// phrases land on degree 2 or 5; the final phrase resolves via finalizeCadence.
export function realizeSpans(
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
