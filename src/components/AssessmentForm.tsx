import { useState } from "react";
import {
	type AssessmentDraft,
	type AttemptLog,
	assessment,
	type Dimension,
	type Rating,
} from "../lib/assessment.ts";
import { RatingScale } from "./RatingScale.tsx";

type Props = {
	pieceId: string;
	grade: number;
	keyName: string;
	onSubmit: (log: AttemptLog) => void;
};

export function AssessmentForm({ pieceId, grade, keyName, onSubmit }: Props) {
	const [draft, setDraft] = useState<AssessmentDraft>(assessment.emptyDraft);

	function rate(key: Dimension, value: Rating) {
		setDraft((d) => ({ ...d, ratings: { ...d.ratings, [key]: value } }));
	}

	function submit() {
		const log = assessment.buildAttemptLog(draft, pieceId, grade, Date.now());
		if (log) onSubmit(log);
	}

	return (
		<section className="assessment" aria-label="self-assessment">
			<h2 className="assessment-heading">Self-assessment</h2>
			{keyName ? (
				<header className="assessment-key">
					<span className="assessment-key-name">
						<span>Key</span>
						<strong>{keyName}</strong>
					</span>
					<label className="key-correct">
						<input
							type="checkbox"
							checked={draft.correctKey}
							onChange={(e) =>
								setDraft((d) => ({ ...d, correctKey: e.target.checked }))
							}
						/>
						Correct
					</label>
				</header>
			) : null}
			{assessment.DIMENSIONS.map((d) => (
				<RatingScale
					key={d.key}
					dimension={d}
					value={draft.ratings[d.key]}
					onRate={(value) => rate(d.key, value)}
				/>
			))}
			<label className="assessment-notes">
				Notes
				<textarea
					value={draft.notes}
					onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
				/>
			</label>
			<button
				type="button"
				disabled={!assessment.isComplete(draft)}
				onClick={submit}
			>
				Save attempt
			</button>
		</section>
	);
}
