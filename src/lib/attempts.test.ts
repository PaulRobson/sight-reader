import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AttemptLog } from "./assessment.ts";
import { attempts } from "./attempts.ts";
import { defaultPiece } from "./defaultPiece.ts";

function mockStore(): Storage {
	const map = new Map<string, string>();
	return {
		getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
		setItem: (k, v) => {
			map.set(k, v);
		},
		removeItem: (k) => {
			map.delete(k);
		},
		clear: () => {
			map.clear();
		},
		key: (i) => Array.from(map.keys())[i] ?? null,
		get length() {
			return map.size;
		},
	};
}

function log(pieceId: string, ratedAt: number): AttemptLog {
	return {
		pieceId,
		ratedAt,
		pitch: 3,
		rhythm: 3,
		keptGoing: 3,
		dynamicsArticulation: 3,
		overallConfidence: 3,
	};
}

describe("attempts", () => {
	beforeEach(() => {
		globalThis.localStorage = mockStore();
	});
	afterEach(() => {
		Reflect.deleteProperty(globalThis, "localStorage");
	});

	it("starts empty", () => {
		expect(attempts.all()).toEqual([]);
	});

	it("persists a saved attempt across reads", () => {
		const a = log("piece-1", 100);
		attempts.save(a);
		expect(attempts.all()).toEqual([a]);
	});

	it("appends in chronological order", () => {
		attempts.save(log("piece-1", 100));
		attempts.save(log("piece-1", 200));
		expect(attempts.all().map((x) => x.ratedAt)).toEqual([100, 200]);
	});

	it("recovers attempts for one piece by pieceId", () => {
		attempts.save(log("piece-1", 100));
		attempts.save(log("piece-2", 200));
		attempts.save(log("piece-1", 300));
		expect(attempts.forPiece("piece-1").map((x) => x.ratedAt)).toEqual([
			100, 300,
		]);
	});
});

describe("same-piece reproduction", () => {
	it("reuses the seed to regenerate identical abc (Try again)", () => {
		expect(defaultPiece(42)).toBe(defaultPiece(42));
	});

	it("a different seed produces a different piece (New piece)", () => {
		expect(defaultPiece(42)).not.toBe(defaultPiece(43));
	});
});
