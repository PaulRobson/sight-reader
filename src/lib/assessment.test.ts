import { describe, expect, it } from "vitest";
import { type AssessmentDraft, assessment } from "./assessment.ts";

const full: AssessmentDraft = {
	ratings: {
		pitch: 4,
		rhythm: 3,
		keptGoing: 5,
		dynamicsArticulation: 2,
		overallConfidence: 4,
	},
	correctKey: true,
	notes: "",
};

describe("assessment.DIMENSIONS", () => {
	it("covers the five AttemptLog rating fields", () => {
		expect(assessment.DIMENSIONS.map((d) => d.key)).toEqual([
			"pitch",
			"rhythm",
			"keptGoing",
			"dynamicsArticulation",
			"overallConfidence",
		]);
	});
});

describe("assessment.isComplete", () => {
	it("is false for an empty draft", () => {
		expect(assessment.isComplete(assessment.emptyDraft)).toBe(false);
	});

	it("is false when any dimension is unrated", () => {
		const partial = { ...full.ratings, dynamicsArticulation: undefined };
		expect(
			assessment.isComplete({ ratings: partial, correctKey: false, notes: "" }),
		).toBe(false);
	});

	it("is true once all five are rated", () => {
		expect(assessment.isComplete(full)).toBe(true);
	});
});

describe("assessment.buildAttemptLog", () => {
	it("returns null when incomplete", () => {
		expect(
			assessment.buildAttemptLog(assessment.emptyDraft, "p1", 1, 100),
		).toBeNull();
	});

	it("produces a valid AttemptLog with pieceId, grade and ratedAt", () => {
		expect(assessment.buildAttemptLog(full, "p1", 3, 1700)).toEqual({
			pieceId: "p1",
			grade: 3,
			ratedAt: 1700,
			pitch: 4,
			rhythm: 3,
			keptGoing: 5,
			dynamicsArticulation: 2,
			overallConfidence: 4,
			correctKey: true,
		});
	});

	it("includes trimmed notes when present", () => {
		const log = assessment.buildAttemptLog(
			{ ...full, notes: "  shaky bar 3 " },
			"p1",
			1,
			1,
		);
		expect(log?.notes).toBe("shaky bar 3");
	});

	it("omits notes when blank or whitespace", () => {
		const log = assessment.buildAttemptLog(
			{ ...full, notes: "   " },
			"p1",
			1,
			1,
		);
		expect(log && "notes" in log).toBe(false);
	});
});
