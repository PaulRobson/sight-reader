import { useState } from "react";
import {
	type AssessmentDraft,
	type AttemptLog,
	assessment,
	type Dimension,
	type Rating,
} from "../lib/assessment.ts";

const RATINGS: Rating[] = [1, 2, 3, 4, 5];

type Props = { pieceId: string; onSubmit: (log: AttemptLog) => void };

export function AssessmentForm({ pieceId, onSubmit }: Props) {
	const [draft, setDraft] = useState<AssessmentDraft>(assessment.emptyDraft);

	function rate(key: Dimension, value: Rating) {
		setDraft((d) => ({ ...d, ratings: { ...d.ratings, [key]: value } }));
	}

	function submit() {
		const log = assessment.buildAttemptLog(draft, pieceId, Date.now());
		if (log) onSubmit(log);
	}

	return (
		<section className="assessment" aria-label="self-assessment">
			{assessment.DIMENSIONS.map((d) => (
				<fieldset key={d.key} className="assessment-dimension">
					<legend>{d.label}</legend>
					{RATINGS.map((value) => (
						<label key={value}>
							<input
								type="radio"
								name={d.key}
								checked={draft.ratings[d.key] === value}
								onChange={() => rate(d.key, value)}
							/>
							{value}
						</label>
					))}
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
