import { describe, expect, it } from "vitest";
import { gradeSummary } from "./gradeSummary.ts";
import type { Settings } from "./useSettings.ts";

const base: Settings = {
	instrumentId: "flute",
	clef: "treble",
	grade: 1,
	mode: "melodic",
	countdownSeconds: 60,
	metronomeOnAttempt: true,
	referenceAvailableBeforeAttempt: false,
};

const row = (rows: { label: string; value: string }[], label: string) =>
	rows.find((r) => r.label === label)?.value;

describe("gradeSummary", () => {
	it("summarises a grade-1 selection in plain language", () => {
		const rows = gradeSummary(base);
		expect(row(rows, "Major keys")).toBe("C, G, F"); // up to 1 accidental
		expect(row(rows, "Minor keys")).toBe("A, E, D");
		expect(row(rows, "Shortest note")).toBe("quarter");
		expect(row(rows, "Largest leap")).toBe("3rd");
		expect(row(rows, "Articulation")).toBe("none");
		expect(row(rows, "Time signatures")).toBe("4/4, 3/4");
		expect(row(rows, "Note range")).toMatch(/ – /);
	});

	it("widens with grade and shows accidental keys", () => {
		const rows = gradeSummary({ ...base, grade: 8 });
		expect(row(rows, "Major keys")).toContain("F♯");
		expect(row(rows, "Minor keys")).toContain("B♭");
		expect(row(rows, "Largest leap")).toBe("11th");
		expect(row(rows, "Shortest note")).toBe("sixteenth");
		expect(row(rows, "Articulation")).not.toBe("none");
	});

	it("reflects the chosen instrument range", () => {
		const flute = gradeSummary(base);
		const cello = gradeSummary({
			...base,
			instrumentId: "cello",
			clef: "bass",
		});
		expect(row(flute, "Note range")).not.toBe(row(cello, "Note range"));
	});
});
