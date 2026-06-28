import { useState } from "react";
import {
	type AssessmentDraft,
	type AttemptLog,
	assessment,
	type Dimension,
	type Rating,
} from "../lib/assessment.ts";

const RATINGS: Rating[] = [1, 2, 3, 4, 5];

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
			{keyName ? (
				<header className="assessment-key">
					<span>Key</span>
					<strong>{keyName}</strong>
				</header>
			) : null}
			{assessment.DIMENSIONS.map((d) => (
				<fieldset key={d.key} className="assessment-dimension">
					<legend>{d.label}</legend>
					<div className="rating-scale">
						<span className="scale-end" aria-hidden="true">
							1
						</span>
						{RATINGS.map((value) => (
							<label key={value} className="rating-option">
								<input
									type="radio"
									name={d.key}
									aria-label={`${value} out of 5`}
									checked={draft.ratings[d.key] === value}
									onChange={() => rate(d.key, value)}
								/>
							</label>
						))}
						<span className="scale-end" aria-hidden="true">
							5
						</span>
					</div>
				</fieldset>
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
