import type { Note } from "./generateMelody.ts";

const LEAP = 2; // semitones; a move > LEAP is a leap, 1..LEAP is a step
const QUARTER = 4; // sixteenth units
const MAX_SLUR = 4; // notes per slur, so phrasing reads as groups not one arc
const ARTIC_PROB = 0.4;
const MIDDLE_C = 60;

// Grand-staff voices split at middle C; keeping a slur on one side of the split
// means its "(" and ")" never land on opposite staves (where one becomes a rest).
const side = (midi: number) => midi >= MIDDLE_C;

// Maximal runs of consecutive sounding notes moving by step on one staff side,
// chunked to MAX_SLUR so long stepwise passages slur in readable groups.
function slurGroups(notes: Note[]): Array<[number, number]> {
	const groups: Array<[number, number]> = [];
	const flush = (s: number, e: number) => {
		for (let c = s; c <= e; c += MAX_SLUR) {
			const end = Math.min(c + MAX_SLUR - 1, e);
			if (end > c) groups.push([c, end]);
		}
	};
	let run = -1;
	for (let i = 1; i < notes.length; i++) {
		const a = notes[i - 1];
		const b = notes[i];
		const step =
			!a.rest &&
			!b.rest &&
			side(a.midi) === side(b.midi) &&
			Math.abs(b.midi - a.midi) >= 1 &&
			Math.abs(b.midi - a.midi) <= LEAP;
		if (step) {
			if (run === -1) run = i - 1;
		} else {
			if (run !== -1) flush(run, i - 1);
			run = -1;
		}
	}
	if (run !== -1) flush(run, notes.length - 1);
	return groups;
}

// At most one point mark for a non-slurred note: staccato on a detached
// repeat/leap, accent on a leap arrival, tenuto on a held note. Null = unmarked.
function pointArticulation(
	set: Set<string>,
	interval: number,
	duration: number,
	rng: () => number,
): string | null {
	const cands: string[] = [];
	if (set.has("staccato") && (interval === 0 || interval > LEAP))
		cands.push("staccato");
	if (set.has("accent") && interval > LEAP) cands.push("accent");
	if (set.has("tenuto") && duration >= QUARTER) cands.push("tenuto");
	if (cands.length === 0 || rng() >= ARTIC_PROB) return null;
	return cands[Math.floor(rng() * cands.length)];
}

function markSlurs(out: Note[], inSlur: boolean[]): void {
	for (const [s, e] of slurGroups(out)) {
		out[s].slurStart = true;
		out[e].slurEnd = true;
		for (let i = s; i <= e; i++) inSlur[i] = true;
	}
}

// §4 step 5 / §5: grade-gated articulation. Slurs cover stepwise groups; the
// remaining notes take at most one point articulation from the grade's vocabulary.
export function applyArticulations(
	notes: Note[],
	allowed: string[],
	rng: () => number,
): Note[] {
	if (allowed.length === 0) return notes;
	const set = new Set(allowed);
	const out = notes.map((n) => ({ ...n }));
	const inSlur = new Array<boolean>(out.length).fill(false);
	if (set.has("slur")) markSlurs(out, inSlur);
	let prevMidi: number | null = null;
	for (let i = 0; i < out.length; i++) {
		const n = out[i];
		if (n.rest) {
			prevMidi = null;
			continue;
		}
		const interval = prevMidi === null ? null : Math.abs(n.midi - prevMidi);
		prevMidi = n.midi;
		if (inSlur[i] || interval === null) continue;
		const mark = pointArticulation(set, interval, n.duration, rng);
		if (mark) n.decorations = [...(n.decorations ?? []), mark];
	}
	return out;
}
