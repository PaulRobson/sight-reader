import { type AttemptLog, assessment } from "../lib/assessment.ts";
import { history } from "../lib/history.ts";
import { HistoryItem } from "./HistoryItem.tsx";

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
						<HistoryItem key={`${l.pieceId}-${l.ratedAt}`} log={l} />
					))}
			</ol>
		</section>
	);
}
