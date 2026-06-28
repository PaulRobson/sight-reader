// abc duration serialization. L:1/16, so a duration in sixteenth units is its
// abc length multiplier. abcjs can't draw 5/9/10/11/13 sixteenths as one
// notehead, so those split into clean values to be tied.
const CLEAN = [16, 15, 14, 12, 8, 7, 6, 4, 3, 2, 1]; // single-notehead values (0–3 dots)
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

const lengthOf = (d: number) => (d === 1 ? "" : `${d}`);

// A whole-bar rest is `Z`, except where the bar length can't be one rest (5/8 =
// 10 sixteenths), where it becomes clean rest values (untied).
function fullBarRest(total: number): string {
	const pieces = split(total);
	return pieces.length === 1
		? "Z"
		: pieces.map((p) => `z${lengthOf(p)}`).join(" ");
}

export const abcDuration = { split, lengthOf, fullBarRest };
