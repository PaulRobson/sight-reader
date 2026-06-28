import { describe, expect, it } from "vitest";
import type { AttemptLog } from "./assessment.ts";
import { history } from "./history.ts";

function log(overrides: Partial<AttemptLog>): AttemptLog {
	return {
		pieceId: "p1",
		grade: 1,
		ratedAt: 1,
		pitch: 3,
		rhythm: 3,
		keptGoing: 3,
		dynamicsArticulation: 3,
		overallConfidence: 3,
		...overrides,
	};
}

describe("history.averages", () => {
	it("returns null for no attempts", () => {
		expect(history.averages([])).toBeNull();
	});

	it("returns the single attempt's ratings unchanged", () => {
		expect(history.averages([log({ pitch: 5, rhythm: 2 })])).toEqual({
			pitch: 5,
			rhythm: 2,
			keptGoing: 3,
			dynamicsArticulation: 3,
			overallConfidence: 3,
		});
	});

	it("averages each dimension independently", () => {
		const avg = history.averages([
			log({ pitch: 2, overallConfidence: 1 }),
			log({ pitch: 4, overallConfidence: 4 }),
		]);
		expect(avg?.pitch).toBe(3);
		expect(avg?.overallConfidence).toBe(2.5);
		expect(avg?.rhythm).toBe(3);
	});
});
