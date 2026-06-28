import { gradeSummary } from "../lib/gradeSummary.ts";
import type { Settings } from "../lib/useSettings.ts";

type Props = { settings: Settings };

export function GradeSummary({ settings }: Props) {
	return (
		<section className="grade-summary" aria-label="grade summary">
			<h3>What grade {settings.grade} gives you</h3>
			<dl>
				{gradeSummary(settings).map((row) => (
					<div key={row.label}>
						<dt>{row.label}</dt>
						<dd>{row.value}</dd>
					</div>
				))}
			</dl>
		</section>
	);
}
