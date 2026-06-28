// Metronome timing read from an abc tune: the click interval and the number of
// beats per bar (the count-in length). Source is the M: time signature and the
// Q:1/4=<bpm> tempo that toAbc always emits, so it works for any generated piece.
export type BeatSpec = { secondsPerBeat: number; beatsPerBar: number };

// Compound metres (6/8, 9/8, 12/8) are felt in dotted-quarter beats; other 8th
// metres (3/8, 5/8, 7/8) and 3/8 are counted in eighths. quartersPerBeat scales
// the quarter-note tempo to the felt beat.
function beatUnit(
	num: number,
	den: number,
): {
	quartersPerBeat: number;
	beatsPerBar: number;
} {
	if (den === 8 && num % 3 === 0 && num > 3) {
		return { quartersPerBeat: 1.5, beatsPerBar: num / 3 };
	}
	if (den === 8) return { quartersPerBeat: 0.5, beatsPerBar: num };
	if (den === 2) return { quartersPerBeat: 2, beatsPerBar: num };
	return { quartersPerBeat: 1, beatsPerBar: num }; // den === 4 and fallback
}

export function beatSpecFromAbc(abc: string): BeatSpec | null {
	const meter = /^M:(\d+)\/(\d+)/m.exec(abc);
	const tempo = /^Q:1\/4=(\d+)/m.exec(abc);
	if (!meter || !tempo) return null;
	const bpmQuarter = Number(tempo[1]);
	if (!bpmQuarter) return null;
	const { quartersPerBeat, beatsPerBar } = beatUnit(
		Number(meter[1]),
		Number(meter[2]),
	);
	return { secondsPerBeat: (60 / bpmQuarter) * quartersPerBeat, beatsPerBar };
}
