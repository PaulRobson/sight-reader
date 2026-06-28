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

// A comfortable playing span (semitones either side of the tessitura centre),
// widening with grade. Kept well inside the instrument's absolute range so
// exercises avoid the expert-only extremes (e.g. cello above A5). The instrument
// range is the hard ceiling; this is the softer band exercises actually use.
export function comfortableRange(
	center: number,
	grade: Grade,
	instrumentLow: number,
	instrumentHigh: number,
): { lowestMidi: number; highestMidi: number } {
	const span = 9 + Math.floor((grade - 1) / 2) * 3; // g1–2:9 … g7–8:18 semitones
	return {
		lowestMidi: Math.max(instrumentLow, center - span),
		highestMidi: Math.min(instrumentHigh, center + span),
	};
}

// The comfortable note band (and its tessitura centre) the current settings
// generate within: the grade-scaled span around the staff centre, clamped to the
// instrument's range. Piano (grand staff) centres on middle C.
export function rangeForSettings(settings: Settings): {
	lowestMidi: number;
	highestMidi: number;
	centerMidi: number;
} {
	const instrument = findInstrument(settings.instrumentId);
	const grade = asGrade(settings.grade);
	const center = isGrandStaff(instrument)
		? GRAND_STAFF_CENTER
		: STAFF_CENTER[settings.clef];
	const range = comfortableRange(
		center,
		grade,
		spnToMidi(instrument.lowestWrittenNote),
		spnToMidi(instrument.highestWrittenNote),
	);
	return { ...range, centerMidi: center };
}

// Written-pitch abc for the current settings + seed: grade drives difficulty,
// generation sits in a grade-scaled comfortable band around the staff (within
// the instrument's range), the key is derived per grade. The abc stays at
// written pitch; transposition to sounding pitch (§6) is applied at synth time,
// never baked here. The instrument's GM program sets the synth timbre via the
// %%MIDI program header the synth reads from the parsed tune.
export function pieceForSettings(settings: Settings, seed: number): string {
	const instrument = findInstrument(settings.instrumentId);
	const grandStaff = isGrandStaff(instrument);
	const grade = asGrade(settings.grade);
	const range = rangeForSettings(settings);
	const melody = generateForGrade({
		grade,
		lowestMidi: range.lowestMidi,
		highestMidi: range.highestMidi,
		seed,
		centerMidi: range.centerMidi,
	});
	return toAbc(melody, {
		tempo: melody.tempo,
		clef: settings.clef,
		meter: melody.timeSignature,
		grandStaff,
		program: instrument.gmProgram,
	});
}
