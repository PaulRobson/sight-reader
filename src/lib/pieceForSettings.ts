import { generateForGrade } from "./generateForGrade.ts";
import type { Grade } from "./gradeDifficulty.ts";
import { findInstrument, spnToMidi } from "./instruments.ts";
import { toAbc } from "./toAbc.ts";
import type { Settings } from "./useSettings.ts";

const asGrade = (grade: number): Grade =>
	Math.min(8, Math.max(1, Math.round(grade))) as Grade;

// Written-pitch abc for the current settings + seed: grade drives difficulty,
// the instrument's written range clamps it, the key is derived per grade. Timbre
// and transposition stay default here; playback fidelity (§6) arrives in Slice 5.
export function pieceForSettings(settings: Settings, seed: number): string {
	const instrument = findInstrument(settings.instrumentId);
	const melody = generateForGrade({
		grade: asGrade(settings.grade),
		lowestMidi: spnToMidi(instrument.lowestWrittenNote),
		highestMidi: spnToMidi(instrument.highestWrittenNote),
		seed,
	});
	return toAbc(melody, {
		tempo: melody.tempo,
		clef: settings.clef,
		meter: melody.timeSignature,
	});
}
