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

export const keys = {
	// Every written key whose signature has at most `max` sharps/flats.
	within(max: number): string[] {
		return KEYS_BY_ACCIDENTALS.slice(0, max + 1).flat();
	},
	// Seeded pick of a written key inside the grade's key-signature breadth.
	pick(max: number, rng: () => number): string {
		const options = keys.within(max);
		return options[Math.floor(rng() * options.length)];
	},
};
