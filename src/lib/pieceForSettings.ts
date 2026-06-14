import { generateForGrade } from "./generateForGrade.ts";
import type { Grade } from "./gradeDifficulty.ts";
import {
	type Clef,
	findInstrument,
	isGrandStaff,
	spnToMidi,
} from "./instruments.ts";
import { toAbc } from "./toAbc.ts";
import type { Settings } from "./useSettings.ts";

const asGrade = (grade: number): Grade =>
	Math.min(8, Math.max(1, Math.round(grade))) as Grade;

// MIDI of the middle staff line per clef, so exercises sit in a comfortable
// tessitura rather than at the instrument range's extreme.
const STAFF_CENTER: Record<Clef, number> = {
	treble: 71, // B4
	bass: 50, // D3
	alto: 60, // C4
	tenor: 57, // A3
};
const GRAND_STAFF_CENTER = 60; // middle C straddles the two staves

// Written-pitch abc for the current settings + seed: grade drives difficulty,
// the instrument's written range clamps it, the key is derived per grade. Timbre
// and transposition stay default here; playback fidelity (§6) arrives in Slice 5.
export function pieceForSettings(settings: Settings, seed: number): string {
	const instrument = findInstrument(settings.instrumentId);
	const grandStaff = isGrandStaff(instrument);
	const melody = generateForGrade({
		grade: asGrade(settings.grade),
		lowestMidi: spnToMidi(instrument.lowestWrittenNote),
		highestMidi: spnToMidi(instrument.highestWrittenNote),
		seed,
		centerMidi: grandStaff ? GRAND_STAFF_CENTER : STAFF_CENTER[settings.clef],
	});
	return toAbc(melody, {
		tempo: melody.tempo,
		clef: settings.clef,
		meter: melody.timeSignature,
		grandStaff,
	});
}
