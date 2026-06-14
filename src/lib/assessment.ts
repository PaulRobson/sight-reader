export type Rating = 1 | 2 | 3 | 4 | 5;

// §2 data model. pieceId + ratedAt come from the attempt context, not the form.
export type AttemptLog = {
	pieceId: string;
	ratedAt: number;
	pitch: Rating;
	rhythm: Rating;
	keptGoing: Rating;
	dynamicsArticulation: Rating;
	overallConfidence: Rating;
	notes?: string;
};

export type Dimension =
	| "pitch"
	| "rhythm"
	| "keptGoing"
	| "dynamicsArticulation"
	| "overallConfidence";

export type AssessmentDraft = {
	ratings: Partial<Record<Dimension, Rating>>;
	notes: string;
};

const DIMENSIONS: { key: Dimension; label: string }[] = [
	{ key: "pitch", label: "Pitch" },
	{ key: "rhythm", label: "Rhythm" },
	{ key: "keptGoing", label: "Kept going (no stops/restarts)" },
	{ key: "dynamicsArticulation", label: "Dynamics & articulation" },
	{ key: "overallConfidence", label: "Overall confidence" },
];

export const assessment = {
	DIMENSIONS,
	emptyDraft: { ratings: {}, notes: "" } as AssessmentDraft,
	isComplete(draft: AssessmentDraft): boolean {
		return DIMENSIONS.every((d) => draft.ratings[d.key] !== undefined);
	},
	buildAttemptLog(
		draft: AssessmentDraft,
		pieceId: string,
		ratedAt: number,
	): AttemptLog | null {
		if (!assessment.isComplete(draft)) return null;
		const r = draft.ratings as Record<Dimension, Rating>;
		const notes = draft.notes.trim();
		return {
			pieceId,
			ratedAt,
			pitch: r.pitch,
			rhythm: r.rhythm,
			keptGoing: r.keptGoing,
			dynamicsArticulation: r.dynamicsArticulation,
			overallConfidence: r.overallConfidence,
			...(notes ? { notes } : {}),
		};
	},
};
