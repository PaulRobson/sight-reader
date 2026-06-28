export type Rating = 1 | 2 | 3 | 4 | 5;

// What each rating point means, so the scale reads as words not bare numbers.
const RATING_LABELS: Record<Rating, string> = {
	1: "Really bad",
	2: "Bad",
	3: "Okay",
	4: "Good",
	5: "Really good",
};

// §2 data model. pieceId + grade + ratedAt come from the attempt context, not the
// form. correctKey records whether the student read/played the right key. abc +
// instrumentId are captured so the piece can be re-rendered and replayed from
// history (optional: attempts saved before this carry neither).
export type AttemptLog = {
	pieceId: string;
	grade: number;
	ratedAt: number;
	pitch: Rating;
	rhythm: Rating;
	keptGoing: Rating;
	dynamicsArticulation: Rating;
	overallConfidence: Rating;
	correctKey?: boolean;
	notes?: string;
	abc?: string;
	instrumentId?: string;
};

export type Dimension =
	| "pitch"
	| "rhythm"
	| "keptGoing"
	| "dynamicsArticulation"
	| "overallConfidence";

export type AssessmentDraft = {
	ratings: Partial<Record<Dimension, Rating>>;
	correctKey: boolean;
	notes: string;
};

const DIMENSIONS: { key: Dimension; label: string; short: string }[] = [
	{ key: "pitch", label: "Pitch", short: "Pitch" },
	{ key: "rhythm", label: "Rhythm", short: "Rhythm" },
	{
		key: "keptGoing",
		label: "Kept going (no stops/restarts)",
		short: "Kept going",
	},
	{
		key: "dynamicsArticulation",
		label: "Dynamics & articulation",
		short: "Dynamics",
	},
	{
		key: "overallConfidence",
		label: "Overall confidence",
		short: "Confidence",
	},
];

export const assessment = {
	DIMENSIONS,
	RATING_LABELS,
	emptyDraft: { ratings: {}, correctKey: false, notes: "" } as AssessmentDraft,
	isComplete(draft: AssessmentDraft): boolean {
		return DIMENSIONS.every((d) => draft.ratings[d.key] !== undefined);
	},
	buildAttemptLog(
		draft: AssessmentDraft,
		pieceId: string,
		grade: number,
		ratedAt: number,
	): AttemptLog | null {
		if (!assessment.isComplete(draft)) return null;
		const r = draft.ratings as Record<Dimension, Rating>;
		const notes = draft.notes.trim();
		return {
			pieceId,
			grade,
			ratedAt,
			pitch: r.pitch,
			rhythm: r.rhythm,
			keptGoing: r.keptGoing,
			dynamicsArticulation: r.dynamicsArticulation,
			overallConfidence: r.overallConfidence,
			correctKey: draft.correctKey,
			...(notes ? { notes } : {}),
		};
	},
};
