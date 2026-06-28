import type { Note } from "./generateMelody";

const HAIRPIN_PROB = 0.4;
const HAIRPIN_OPEN: Record<string, string> = {
	cresc: "crescendo(",
	dim: "diminuendo(",
};
const HAIRPIN_CLOSE: Record<string, string> = {
	cresc: "crescendo)",
	dim: "diminuendo)",
};

function addDeco(note: Note, token: string): void {
	note.decorations = [...(note.decorations ?? []), token];
}

function firstPitched(notes: Note[], from: number, to: number): number {
	for (let i = from; i <= to; i++) if (!notes[i].rest) return i;
	return -1;
}

function lastPitched(notes: Note[], from: number, to: number): number {
	for (let i = to; i >= from; i--) if (!notes[i].rest) return i;
	return -1;
}

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
// cresc/dim open a hairpin there and close it on the phrase's last sounding note.
// The opening phrase is always a static level so the piece starts defined.
export function applyDynamics(
	notes: Note[],
	phraseStarts: number[],
	vocab: string[],
	rng: () => number,
): Note[] {
	const statics = vocab.filter((w) => w !== "cresc" && w !== "dim");
	const hairpins = vocab.filter((w) => w === "cresc" || w === "dim");
	if (statics.length === 0) return notes;
	const out = notes.map((n) => ({ ...n }));
	let prev: string | null = null;
	phraseStarts.forEach((start, i) => {
		const end = (phraseStarts[i + 1] ?? out.length) - 1;
		const open = firstPitched(out, start, end);
		if (open === -1) return; // all-rest phrase: nothing to mark
		const close = lastPitched(out, start, end);
		if (i > 0 && hairpins.length > 0 && close > open && rng() < HAIRPIN_PROB) {
			const word = hairpins[Math.floor(rng() * hairpins.length)];
			addDeco(out[open], HAIRPIN_OPEN[word]);
			addDeco(out[close], HAIRPIN_CLOSE[word]);
		} else {
			const word = pickStatic(statics, rng, prev);
			addDeco(out[open], word);
			prev = word;
		}
	});
	return out;
}
