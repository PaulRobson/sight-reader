import { describe, expect, it } from "vitest";
import { barsPerLine } from "./barsPerLine.ts";

describe("barsPerLine", () => {
	it("keeps touch devices at a spacious 4 regardless of width", () => {
		for (const width of [320, 740, 1098, 1400]) {
			expect(barsPerLine(width, false)).toBe(4);
		}
	});

	it("never drops below 4 on a desktop, even in a narrow window", () => {
		expect(barsPerLine(320, true)).toBe(4);
		expect(barsPerLine(700, true)).toBe(4);
	});

	it("keeps an iPad-portrait-width desktop window at 4", () => {
		expect(barsPerLine(740, true)).toBe(4);
	});

	it("packs more bars as a desktop window widens", () => {
		expect(barsPerLine(1184, true)).toBeGreaterThan(4); // typical desktop
		expect(barsPerLine(1480, true)).toBeGreaterThan(barsPerLine(1000, true));
	});

	it("is non-decreasing in width on desktop", () => {
		let prev = 0;
		for (let w = 300; w <= 2000; w += 50) {
			const n = barsPerLine(w, true);
			expect(n).toBeGreaterThanOrEqual(prev);
			prev = n;
		}
	});

	it("holds desktop density near the ~185px/measure target", () => {
		for (const width of [900, 1184, 1600]) {
			const perMeasure = width / barsPerLine(width, true);
			expect(perMeasure).toBeLessThan(240);
			expect(perMeasure).toBeGreaterThan(150);
		}
	});
});
