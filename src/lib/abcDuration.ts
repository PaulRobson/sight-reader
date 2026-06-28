// abc duration serialization. L:1/16, so a duration in sixteenth units is its
// abc length multiplier. abcjs can't draw 5/9/10/11/13 sixteenths as one
// notehead, so those split into clean values to be tied.
const CLEAN = [16, 15, 14, 12, 8, 7, 6, 4, 3, 2, 1, 0.5]; // single noteheads; 0.5 = thirty-second
const cleanSet = new Set(CLEAN);

// Split a non-representable duration into clean values. Durations above a whole
// note (full bars of the larger metres) are left for abcjs. 1 ∈ CLEAN, so this
// terminates.
function split(d: number): number[] {
	if (d > 16 || cleanSet.has(d)) return [d];
	const pieces: number[] = [];
	let rem = d;
	for (const v of CLEAN)
		while (rem >= v) {
			pieces.push(v);
			rem -= v;
		}
	return pieces;
}

// abc length multiplier at L:1/16: "" for the unit (a sixteenth), "/n" for a
// sub-unit (a thirty-second is "/2"), the integer otherwise.
function lengthOf(d: number): string {
	if (d === 1) return "";
	if (d < 1) return `/${Math.round(1 / d)}`;
	return `${d}`;
}

// A whole-bar rest as a duration rest (z16, z24, …), not abc's `Z`: abcjs draws
// a multi-measure count ("1") above every `Z`, even a single bar, which clutters
// the empty staff of a grand-staff bar. A measure-filling rest is auto-drawn as a
// centred whole rest by abcjs regardless of meter, so this stays clean. A bar
// length abcjs can't draw as one rest (5/8 = 10) still splits into clean values.
function fullBarRest(total: number): string {
	return split(total)
		.map((p) => `z${lengthOf(p)}`)
		.join(" ");
}

// Rest values largest-first. Dotted-quarter (6) covers compound beats; binary
// values cover simple/cut. Larger/dotted-finer values are reached by combination.
const REST_VALUES = [8, 6, 4, 2, 1];

// A rest value v fits at bar-position pos when it starts on its own grid and
// either stays inside one beat or spans whole beats from a beat boundary — so a
// run never crosses a beat line with a partial rest (keeps the metre legible).
function restFits(pos: number, v: number, beat: number): boolean {
	if (pos % v !== 0) return false;
	const crosses = Math.floor(pos / beat) !== Math.floor((pos + v - 1) / beat);
	return !crosses || (pos % beat === 0 && v % beat === 0);
}

// Merge a run of consecutive rests (starting `start` sixteenths into the bar, of
// `length`, with the metre's `beat` group) into as few rests as the grid allows:
// four eighth-rests at a bar start become one half rest, but a run across beat 3
// of 4/4 stays split there.
function restRun(start: number, length: number, beat: number): string {
	const pieces: string[] = [];
	let pos = start;
	let rem = length;
	while (rem > 0) {
		const v = REST_VALUES.find((x) => x <= rem && restFits(pos, x, beat)) ?? 1;
		pieces.push(`z${lengthOf(v)}`);
		pos += v;
		rem -= v;
	}
	return pieces.join(" ");
}

// Sixteenths per beam/beat group: a quarter for simple metres, a dotted quarter
// for compound (x/8 with a multiple-of-3 numerator), a half for cut time.
function beatUnits(meter: string): number {
	const [num, den] = meter.split("/").map(Number);
	if (den === 2) return 8;
	if (den === 8 && num % 3 === 0) return 6;
	return 4;
}

export const abcDuration = { split, lengthOf, fullBarRest, restRun, beatUnits };
