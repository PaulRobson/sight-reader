// Metronome timing read from an abc tune: the click interval and the number of
// beats per bar (the count-in length). Source is the M: time signature and the
// Q:1/4=<bpm> tempo that toAbc always emits, so it works for any generated piece.
export type BeatSpec = { secondsPerBeat: number; beatsPerBar: number };

// The count-in clicks every notated beat unit — the denominator's note value,
// numerator times. So 6/8 counts all six eighths (not two dotted-quarter beats),
// 4/4 four quarters, 2/2 two halves. quartersPerBeat is that unit in quarters.
export function beatSpecFromAbc(abc: string): BeatSpec | null {
	const meter = /^M:(\d+)\/(\d+)/m.exec(abc);
	const tempo = /^Q:1\/4=(\d+)/m.exec(abc);
	if (!meter || !tempo) return null;
	const bpmQuarter = Number(tempo[1]);
	if (!bpmQuarter) return null;
	const quartersPerBeat = 4 / Number(meter[2]);
	return {
		secondsPerBeat: (60 / bpmQuarter) * quartersPerBeat,
		beatsPerBar: Number(meter[1]),
	};
}
