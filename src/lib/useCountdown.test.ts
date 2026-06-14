import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCountdown } from "./useCountdown.ts";

describe("createCountdown", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it("counts down once per second and fires onDone at zero", () => {
		const ticks: number[] = [];
		const onDone = vi.fn();
		createCountdown(3, (r) => ticks.push(r), onDone);
		expect(ticks).toEqual([3]);
		vi.advanceTimersByTime(1000);
		expect(ticks).toEqual([3, 2]);
		vi.advanceTimersByTime(2000);
		expect(ticks).toEqual([3, 2, 1, 0]);
		expect(onDone).toHaveBeenCalledTimes(1);
	});

	it("Skip jumps to zero and fires onDone immediately", () => {
		const ticks: number[] = [];
		const onDone = vi.fn();
		const c = createCountdown(60, (r) => ticks.push(r), onDone);
		expect(ticks).toEqual([60]);
		c.skip();
		expect(ticks).toEqual([60, 0]);
		expect(onDone).toHaveBeenCalledTimes(1);
	});

	it("does not double-fire onDone when the timer runs after Skip", () => {
		const onDone = vi.fn();
		const c = createCountdown(2, vi.fn(), onDone);
		c.skip();
		vi.advanceTimersByTime(5000);
		expect(onDone).toHaveBeenCalledTimes(1);
	});

	it("treats 0 seconds as skip: done immediately, no interval", () => {
		const ticks: number[] = [];
		const onDone = vi.fn();
		createCountdown(0, (r) => ticks.push(r), onDone);
		expect(ticks).toEqual([0]);
		expect(onDone).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(5000);
		expect(onDone).toHaveBeenCalledTimes(1);
	});

	it("cancel stops further ticks and never fires onDone", () => {
		const ticks: number[] = [];
		const onDone = vi.fn();
		const c = createCountdown(5, (r) => ticks.push(r), onDone);
		vi.advanceTimersByTime(1000);
		c.cancel();
		vi.advanceTimersByTime(10000);
		expect(ticks).toEqual([5, 4]);
		expect(onDone).not.toHaveBeenCalled();
	});
});
