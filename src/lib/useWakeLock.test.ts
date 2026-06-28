import { describe, expect, it } from "vitest";
import { keepAwake } from "./useWakeLock.ts";

describe("keepAwake", () => {
	it("is a no-op that never throws where Wake Lock is unsupported", () => {
		// The node test env has no navigator.wakeLock, so this exercises the
		// unsupported path: acquiring and releasing must not throw.
		const handle = keepAwake();
		expect(() => handle.release()).not.toThrow();
	});
});
