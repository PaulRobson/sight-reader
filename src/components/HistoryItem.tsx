import { useState } from "react";
import { type AttemptLog, assessment } from "../lib/assessment.ts";
import { midiTransposeForInstrument } from "../lib/midiTransposeForInstrument.ts";
import { ExerciseView } from "./ExerciseView.tsx";

type Props = { log: AttemptLog };

export function HistoryItem({ log }: Props) {
	const [open, setOpen] = useState(false);
	return (
		<li className="history-item">
			<div className="history-item-head">
				<time dateTime={new Date(log.ratedAt).toISOString()}>
					{new Date(log.ratedAt).toLocaleString(undefined, {
						dateStyle: "medium",
						timeStyle: "short",
					})}
				</time>
				<span className="grade-badge">Grade {log.grade}</span>
			</div>
			<div className="history-ratings">
				{assessment.DIMENSIONS.map((d) => (
					<div key={d.key} className="history-rating">
						<span className="history-rating-value">{log[d.key]}</span>
						<span className="history-rating-label">{d.short}</span>
					</div>
				))}
			</div>
			{log.notes ? <p className="history-notes">{log.notes}</p> : null}
			{log.abc ? (
				<>
					<button
						type="button"
						className="history-show-piece"
						aria-expanded={open}
						onClick={() => setOpen((o) => !o)}
					>
						{open ? "Hide piece" : "Show piece"}
					</button>
					{open ? (
						<ExerciseView
							abc={log.abc}
							midiTranspose={midiTransposeForInstrument(log.instrumentId ?? "")}
						/>
					) : null}
				</>
			) : null}
		</li>
	);
}
