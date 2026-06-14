import { type AttemptLog, assessment, type Dimension } from "./assessment.ts";

// Mean of each rating dimension across attempts; null when there are none.
export const history = {
	averages(logs: AttemptLog[]): Record<Dimension, number> | null {
		if (logs.length === 0) return null;
		const out = {} as Record<Dimension, number>;
		for (const { key } of assessment.DIMENSIONS) {
			out[key] = logs.reduce((sum, l) => sum + l[key], 0) / logs.length;
		}
		return out;
	},
};
