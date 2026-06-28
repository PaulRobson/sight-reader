import { scale } from "./scale.ts";

// Written major keys grouped by key-signature size (sharps or flats). Index =
// accidental count, so index 0 is C major, index 1 is one sharp/flat, etc. (§5
// "Max key sig"). Enharmonic pairs share a tier; either is equally easy to read.
const KEYS_BY_ACCIDENTALS: string[][] = [
	["C"],
	["G", "F"],
	["D", "Bb"],
	["A", "Eb"],
	["E", "Ab"],
	["B", "Db"],
	["F#", "Gb"],
	["C#", "Cb"],
];

// Share of generated pieces that are minor (the rest major).
const MINOR_SHARE = 0.4;

const accToString = (acc: number): string =>
	acc > 0 ? "#".repeat(acc) : "b".repeat(-acc);

// Relative minor of a major key: its 6th degree, spelled, with the "m" marker.
// It shares the major's key signature, so it sits in the same accidental tier.
function relativeMinor(major: string): string {
	const sixth = scale.major(major)[5];
	return `${sixth.letter}${accToString(sixth.accidental)}m`;
}

export const keys = {
	// Every written major key whose signature has at most `max` sharps/flats.
	within(max: number): string[] {
		return KEYS_BY_ACCIDENTALS.slice(0, max + 1).flat();
	},
	// Same breadth, as relative-minor keys.
	minorWithin(max: number): string[] {
		return keys.within(max).map(relativeMinor);
	},
	// Seeded pick of a written key inside the grade's breadth: minor a MINOR_SHARE
	// of the time, otherwise major.
	pick(max: number, rng: () => number): string {
		const options =
			rng() < MINOR_SHARE ? keys.minorWithin(max) : keys.within(max);
		return options[Math.floor(rng() * options.length)];
	},
};
