import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { storage } from "./storage.ts";

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

describe("storage", () => {
	beforeEach(() => {
		globalThis.localStorage = mockStore();
	});
	afterEach(() => {
		Reflect.deleteProperty(globalThis, "localStorage");
	});

	it("round-trips a value", () => {
		storage.save("k", { a: 1, b: ["x"] });
		expect(storage.load("k", null)).toEqual({ a: 1, b: ["x"] });
	});

	it("returns the fallback for a missing key", () => {
		expect(storage.load("absent", 42)).toBe(42);
	});

	it("returns the fallback for a corrupt value", () => {
		globalThis.localStorage.setItem("bad", "{not json");
		expect(storage.load("bad", "fallback")).toBe("fallback");
	});

	it("overwrites an existing value", () => {
		storage.save("k", 1);
		storage.save("k", 2);
		expect(storage.load("k", 0)).toBe(2);
	});

	it("preserves falsy stored values rather than using the fallback", () => {
		storage.save("zero", 0);
		expect(storage.load("zero", 99)).toBe(0);
	});
});
