import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { debounce } from "./debounce.ts";

describe("debounce", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it("collapses a burst into one trailing call", () => {
		const fn = vi.fn();
		const d = debounce(fn, 100);
		d();
		d();
		d();
		expect(fn).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("passes the latest call's arguments", () => {
		const fn = vi.fn();
		const d = debounce(fn, 100);
		d("a");
		d("b");
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledWith("b");
	});

	it("restarts the timer on each call", () => {
		const fn = vi.fn();
		const d = debounce(fn, 100);
		d();
		vi.advanceTimersByTime(60);
		d(); // resets the 100ms window
		vi.advanceTimersByTime(60);
		expect(fn).not.toHaveBeenCalled(); // 120ms elapsed but only 60ms since last call
		vi.advanceTimersByTime(40);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("fires again for a later, separate burst", () => {
		const fn = vi.fn();
		const d = debounce(fn, 100);
		d();
		vi.advanceTimersByTime(100);
		d();
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it("cancel() drops a pending call", () => {
		const fn = vi.fn();
		const d = debounce(fn, 100);
		d();
		d.cancel();
		vi.advanceTimersByTime(100);
		expect(fn).not.toHaveBeenCalled();
	});

	it("cancel() is safe with nothing pending", () => {
		const fn = vi.fn();
		const d = debounce(fn, 100);
		expect(() => d.cancel()).not.toThrow();
	});
});
