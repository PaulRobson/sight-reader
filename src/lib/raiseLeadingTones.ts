import type { Note } from "./generateMelody.ts";
import { scale } from "./scale.ts";

const pc = (midi: number): number => ((midi % 12) + 12) % 12;

function nextSounding(notes: Note[], from: number): Note | undefined {
	for (let i = from; i < notes.length; i++) if (!notes[i].rest) return notes[i];
	return undefined;
}

// Harmonic-minor cadence: raise the natural-minor 7th (subtonic) to a leading
// tone wherever it resolves up by step to the tonic. Major keys are untouched.
// The note keeps its letter and gains a sharp (e.g. G->G#, or Bb->B natural),
// which the serializer renders as an explicit accidental against the minor sig.
export function raiseLeadingTones(notes: Note[], key: string): Note[] {
	if (!key.endsWith("m")) return notes;
	const degrees = scale.degrees(key);
	const tonicPc = degrees[0].pitchClass;
	const subtonicPc = degrees[6].pitchClass;
	return notes.map((n, i) => {
		if (n.rest || pc(n.midi) !== subtonicPc) return n;
		const next = nextSounding(notes, i + 1);
		if (!next || pc(next.midi) !== tonicPc) return n;
		const stepUp = next.midi > n.midi && next.midi - n.midi <= 2;
		return stepUp
			? { ...n, midi: n.midi + 1, accidental: n.accidental + 1 }
			: n;
	});
}
