import type { Note } from "./generateMelody";

const MAX_HAIRPIN_BARS = 2; // a cresc/dim spans at most this many bars
const HAIRPIN_OPEN: Record<string, string> = {
	cresc: "crescendo(",
	dim: "diminuendo(",
};
const HAIRPIN_CLOSE: Record<string, string> = {
	cresc: "crescendo)",
	dim: "diminuendo)",
};

export function addDeco(note: Note, token: string): void {
	note.decorations = [...(note.decorations ?? []), token];
}

export function firstPitched(notes: Note[], from: number, to: number): number {
	for (let i = from; i <= to; i++) if (!notes[i].rest) return i;
	return -1;
}

// Furthest pitched note whose run from `open` stays within `maxUnits` of musical
// time, so the hairpin never spans more than MAX_HAIRPIN_BARS. -1 if none fits.
function hairpinClose(
	notes: Note[],
	open: number,
	end: number,
	maxUnits: number,
): number {
	let span = notes[open].duration;
	let close = -1;
	for (let i = open + 1; i <= end; i++) {
		span += notes[i].duration;
		if (span > maxUnits) break;
		if (!notes[i].rest) close = i;
	}
	return close;
}

// The level a hairpin resolves to: 1-2 steps louder (cresc) or softer (dim) than
// the current level. Null when there is no headroom (already loudest/softest).
function destinationFor(
	word: string,
	ordered: string[],
	prev: string | null,
	rng: () => number,
): string | null {
	if (ordered.length === 0) return null;
	const idx = prev ? ordered.indexOf(prev) : -1;
	const cur = idx === -1 ? Math.floor((ordered.length - 1) / 2) : idx;
	const step = 1 + Math.floor(rng() * 2);
	if (word === "cresc") {
		if (cur >= ordered.length - 1) return null;
		return ordered[Math.min(cur + step, ordered.length - 1)];
	}
	if (cur <= 0) return null;
	return ordered[Math.max(cur - step, 0)];
}

// Opens a hairpin on `open`, capped to MAX_HAIRPIN_BARS, and states its
// destination level on the closing note so the swell has a defined target.
// Returns the destination level (the new running level), or null when no hairpin
// fits (the caller then places a static instead).
export function placeHairpin(
	notes: Note[],
	open: number,
	end: number,
	hairpins: string[],
	ordered: string[],
	prev: string | null,
	barUnits: number,
	rng: () => number,
): string | null {
	const word = hairpins[Math.floor(rng() * hairpins.length)];
	const close = hairpinClose(notes, open, end, MAX_HAIRPIN_BARS * barUnits);
	const dest = destinationFor(word, ordered, prev, rng);
	if (close <= open || !dest) return null;
	addDeco(notes[open], HAIRPIN_OPEN[word]);
	addDeco(notes[close], HAIRPIN_CLOSE[word]);
	addDeco(notes[close], dest);
	return dest;
}
