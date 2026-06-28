import { assessment, type Dimension, type Rating } from "../lib/assessment.ts";

const RATINGS: Rating[] = [1, 2, 3, 4, 5];

type Props = {
	dimension: { key: Dimension; label: string };
	value: Rating | undefined;
	onRate: (value: Rating) => void;
};

// A horizontal 1–5 scale: only the endpoints are labelled visibly; every radio
// carries the descriptive word as its accessible name + hover title.
export function RatingScale({ dimension, value, onRate }: Props) {
	return (
		<fieldset className="assessment-dimension">
			<legend>{dimension.label}</legend>
			<div className="rating-scale">
				<span className="scale-end" aria-hidden="true">
					{assessment.RATING_LABELS[1]}
				</span>
				{RATINGS.map((r) => (
					<label
						key={r}
						className="rating-option"
						title={assessment.RATING_LABELS[r]}
					>
						<input
							type="radio"
							name={dimension.key}
							aria-label={assessment.RATING_LABELS[r]}
							checked={value === r}
							onChange={() => onRate(r)}
						/>
					</label>
				))}
				<span className="scale-end" aria-hidden="true">
					{assessment.RATING_LABELS[5]}
				</span>
			</div>
		</fieldset>
	);
}
