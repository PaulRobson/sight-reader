import { describe, expect, it } from "vitest";
import { beatSpecFromAbc } from "./beatSpecFromAbc.ts";

const abc = (meter: string, bpm: number) =>
	`X:1\nT:t\nM:${meter}\nL:1/16\nQ:1/4=${bpm}\nK:C\nC4`;

describe("beatSpecFromAbc", () => {
	it("derives quarter-note beats for simple metres", () => {
		expect(beatSpecFromAbc(abc("4/4", 60))).toEqual({
			secondsPerBeat: 1,
			beatsPerBar: 4,
		});
		expect(beatSpecFromAbc(abc("3/4", 120))).toEqual({
			secondsPerBeat: 0.5,
			beatsPerBar: 3,
		});
		expect(beatSpecFromAbc(abc("2/4", 60))?.beatsPerBar).toBe(2);
	});

	it("counts every eighth in x/8 metres (6/8 = six, not two)", () => {
		// 6/8 at quarter=120 -> eighth = 0.5 quarters = 0.25s; six beats/bar.
		expect(beatSpecFromAbc(abc("6/8", 120))).toEqual({
			secondsPerBeat: 0.25,
			beatsPerBar: 6,
		});
		expect(beatSpecFromAbc(abc("9/8", 120))?.beatsPerBar).toBe(9);
		expect(beatSpecFromAbc(abc("12/8", 120))?.beatsPerBar).toBe(12);
		expect(beatSpecFromAbc(abc("3/8", 120))).toEqual({
			secondsPerBeat: 0.25,
			beatsPerBar: 3,
		});
		expect(beatSpecFromAbc(abc("7/8", 120))?.beatsPerBar).toBe(7);
		expect(beatSpecFromAbc(abc("5/8", 120))?.beatsPerBar).toBe(5);
	});

	it("feels half-note metres (cut) in half beats", () => {
		// 2/2 at quarter=120 -> half note = 2 quarters = 1s; two beats/bar.
		expect(beatSpecFromAbc(abc("2/2", 120))).toEqual({
			secondsPerBeat: 1,
			beatsPerBar: 2,
		});
	});

	it("returns null when the headers are missing", () => {
		expect(beatSpecFromAbc("X:1\nK:C\nC4")).toBeNull();
	});
});
