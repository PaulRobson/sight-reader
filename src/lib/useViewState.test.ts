import { describe, expect, it } from "vitest";
import { type View, type ViewEvent, viewReducer } from "./useViewState.ts";

describe("viewReducer", () => {
	it("advances through the happy-path flow", () => {
		expect(viewReducer("settings", { type: "start" })).toBe("prep");
		expect(viewReducer("prep", { type: "countdownDone" })).toBe("playNow");
		expect(viewReducer("playNow", { type: "finishAttempt" })).toBe("assess");
		expect(viewReducer("assess", { type: "saveAttempt" })).toBe("settings");
	});

	it("opens and closes history", () => {
		expect(viewReducer("settings", { type: "openHistory" })).toBe("history");
		expect(viewReducer("assess", { type: "openHistory" })).toBe("history");
		expect(viewReducer("history", { type: "closeHistory" })).toBe("settings");
	});

	it("ignores events invalid for the current view (no-op)", () => {
		expect(viewReducer("playNow", { type: "start" })).toBe("playNow");
		expect(viewReducer("settings", { type: "finishAttempt" })).toBe("settings");
		expect(viewReducer("history", { type: "start" })).toBe("history");
	});

	it("reduces a full session sequence", () => {
		const events: ViewEvent[] = [
			{ type: "start" },
			{ type: "countdownDone" },
			{ type: "finishAttempt" },
			{ type: "openHistory" },
			{ type: "closeHistory" },
		];
		const final = events.reduce<View>(viewReducer, "settings");
		expect(final).toBe("settings");
	});
});
