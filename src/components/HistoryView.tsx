import { type AttemptLog, assessment } from "../lib/assessment.ts";
import { history } from "../lib/history.ts";

// Fixed until Slice 3 persists settings/GeneratedPiece; the thin path is grade 1.
const THIN_PATH_GRADE = 1;

type Props = { logs: AttemptLog[] };

export function HistoryView({ logs }: Props) {
	const averages = history.averages(logs);
	if (!averages) {
		return (
			<section className="history" aria-label="history">
				<p>No attempts yet.</p>
			</section>
		);
	}
	return (
		<section className="history" aria-label="history">
			<ol className="history-list">
				{logs.map((l) => (
					<li key={`${l.pieceId}-${l.ratedAt}`}>
						<time>{new Date(l.ratedAt).toLocaleDateString()}</time>
						<span> · Grade {THIN_PATH_GRADE} · </span>
						{assessment.DIMENSIONS.map((d) => (
							<span key={d.key} className="history-rating">
								{d.label}: {l[d.key]}
							</span>
						))}
					</li>
				))}
			</ol>
			<dl className="history-averages">
				{assessment.DIMENSIONS.map((d) => (
					<div key={d.key}>
						<dt>{d.label} (avg)</dt>
						<dd>{averages[d.key].toFixed(1)}</dd>
					</div>
				))}
			</dl>
		</section>
	);
}
