// Thin localStorage wrapper. load() falls back on a missing key or unparseable
// value; save() serialises as JSON.
export const storage = {
	load<T>(key: string, fallback: T): T {
		const raw = globalThis.localStorage?.getItem(key);
		if (raw === null || raw === undefined) return fallback;
		try {
			return JSON.parse(raw) as T;
		} catch {
			return fallback;
		}
	},
	save<T>(key: string, value: T): void {
		globalThis.localStorage?.setItem(key, JSON.stringify(value));
	},
};
