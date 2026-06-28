import { type Grade, gradeDifficulty } from "./gradeDifficulty.ts";
import { midiToNoteName } from "./instruments.ts";
import { keys } from "./keys.ts";
import { rangeForSettings } from "./pieceForSettings.ts";
import type { Settings } from "./useSettings.ts";

const asGrade = (g: number): Grade =>
	Math.min(8, Math.max(1, Math.round(g))) as Grade;

const span = ([lo, hi]: [number, number]): string =>
	lo === hi ? `${lo}` : `${lo}–${hi}`;

// Tonic only (the row label conveys major/minor), with display accidentals.
const tonicLabel = (key: string): string =>
	key.replace(/m$/, "").replace("#", "♯").replace("b", "♭");

const NOTE_VALUE: Record<number, string> = {
	1: "sixteenth",
	2: "eighth",
	3: "dotted eighth",
	4: "quarter",
};

// Leap in scale steps: 1 step = a 2nd, 2 = a 3rd, … 7 = an octave.
const INTERVAL = [
	"",
	"2nd",
	"3rd",
	"4th",
	"5th",
	"6th",
	"7th",
	"octave",
	"9th",
	"10th",
	"11th",
];

export type SummaryRow = { label: string; value: string };

// Plain-language explanation of what the chosen grade (with the current
// instrument + clef) produces, for the settings panel.
export function gradeSummary(settings: Settings): SummaryRow[] {
	const p = gradeDifficulty[asGrade(settings.grade)];
	const max = p.maxKeyAccidentals;
	const range = rangeForSettings(settings);
	return [
		{
			label: "Note range",
			value: `${midiToNoteName(range.lowestMidi)} – ${midiToNoteName(range.highestMidi)}`,
		},
		{ label: "Major keys", value: keys.within(max).map(tonicLabel).join(", ") },
		{
			label: "Minor keys",
			value: keys.minorWithin(max).map(tonicLabel).join(", "),
		},
		{ label: "Bars", value: span(p.bars) },
		{ label: "Time signatures", value: p.timeSignatures.join(", ") },
		{ label: "Tempo", value: `${span(p.tempoBpm)} BPM` },
		{
			label: "Shortest note",
			value: NOTE_VALUE[p.shortestNoteSixteenths] ?? "sixteenth",
		},
		{
			label: "Largest leap",
			value: INTERVAL[p.maxLeapScaleSteps] ?? `${p.maxLeapScaleSteps + 1}th`,
		},
		{ label: "Dynamics", value: p.dynamics.join(", ") },
		{
			label: "Articulation",
			value: p.articulations.length ? p.articulations.join(", ") : "none",
		},
		{ label: "Accidentals", value: p.accidentals },
	];
}
