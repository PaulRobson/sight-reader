import { type AttemptLog, assessment } from "../lib/assessment.ts";
import { history } from "../lib/history.ts";

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
			<h3 className="history-heading">
				Averages over {logs.length} attempt{logs.length === 1 ? "" : "s"}
			</h3>
			<dl className="history-averages">
				{assessment.DIMENSIONS.map((d) => (
					<div key={d.key}>
						<dt>{d.short}</dt>
						<dd>{averages[d.key].toFixed(1)}</dd>
					</div>
				))}
			</dl>
			<h3 className="history-heading">Attempts</h3>
			<ol className="history-list">
				{logs
					.slice()
					.reverse()
					.map((l) => (
						<li key={`${l.pieceId}-${l.ratedAt}`} className="history-item">
							<div className="history-item-head">
								<time dateTime={new Date(l.ratedAt).toISOString()}>
									{new Date(l.ratedAt).toLocaleString(undefined, {
										dateStyle: "medium",
										timeStyle: "short",
									})}
								</time>
								<span className="grade-badge">Grade {l.grade}</span>
							</div>
							<div className="history-ratings">
								{assessment.DIMENSIONS.map((d) => (
									<div key={d.key} className="history-rating">
										<span className="history-rating-value">{l[d.key]}</span>
										<span className="history-rating-label">{d.short}</span>
									</div>
								))}
							</div>
							{l.notes ? <p className="history-notes">{l.notes}</p> : null}
						</li>
					))}
			</ol>
		</section>
	);
}
