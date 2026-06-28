import type { Note } from "./generateMelody";
import { addDeco, firstPitched, placeHairpin } from "./placeHairpin.ts";

const HAIRPIN_PROB = 0.4;
// Static levels softest..loudest; a hairpin resolves by stepping along this.
const LOUDNESS = ["pp", "p", "mp", "mf", "f", "ff"];

// Seeded pick, avoiding an immediate repeat so adjacent phrases contrast.
function pickStatic(
	statics: string[],
	rng: () => number,
	prev: string | null,
): string {
	const w = statics[Math.floor(rng() * statics.length)];
	if (w === prev && statics.length > 1)
		return statics[(statics.indexOf(w) + 1) % statics.length];
	return w;
}

// §4 step 5 / §5: one dynamic marking at the start of each phrase, drawn from the
// grade's vocabulary. Static words (p..ff) mark the phrase's first sounding note;
// cresc/dim open a hairpin there, capped to two bars, resolving to a stated level.
// The opening phrase is always a static level so the piece starts defined.
export function applyDynamics(
	notes: Note[],
	phraseStarts: number[],
	vocab: string[],
	barUnits: number,
	rng: () => number,
): Note[] {
	const statics = vocab.filter((w) => w !== "cresc" && w !== "dim");
	const hairpins = vocab.filter((w) => w === "cresc" || w === "dim");
	if (statics.length === 0) return notes;
	const ordered = LOUDNESS.filter((w) => statics.includes(w));
	const out = notes.map((n) => ({ ...n }));
	let prev: string | null = null;
	phraseStarts.forEach((start, i) => {
		const end = (phraseStarts[i + 1] ?? out.length) - 1;
		const open = firstPitched(out, start, end);
		if (open === -1) return; // all-rest phrase: nothing to mark
		const placed =
			i > 0 && hairpins.length > 0 && rng() < HAIRPIN_PROB
				? placeHairpin(out, open, end, hairpins, ordered, prev, barUnits, rng)
				: null;
		if (placed) {
			prev = placed;
			return;
		}
		const word = pickStatic(statics, rng, prev);
		addDeco(out[open], word);
		prev = word;
	});
	return out;
}
