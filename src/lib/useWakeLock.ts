import { useEffect } from "react";

type WakeLockSentinelLike = { release: () => Promise<void> };
type WakeLockNavigator = {
	wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
};

export type WakeLockHandle = { release: () => void };

const NOOP: WakeLockHandle = { release: () => {} };

// Hold a screen wake lock so the device doesn't dim/sleep mid-read (§9). The
// browser drops the lock when the tab is hidden, so re-acquire on
// visibilitychange. A no-op that never throws where the API is unsupported
// (Safari < 16.4, etc.). release() stops re-acquiring and drops the lock.
export function keepAwake(): WakeLockHandle {
	const nav = (globalThis.navigator as WakeLockNavigator | undefined) ?? {};
	if (!nav.wakeLock || typeof document === "undefined") return NOOP;
	let sentinel: WakeLockSentinelLike | null = null;
	let released = false;
	const request = async () => {
		try {
			sentinel = (await nav.wakeLock?.request("screen")) ?? null;
		} catch {
			// request can reject (not visible, denied); leave the screen as-is.
		}
	};
	const onVisible = () => {
		if (!released && document.visibilityState === "visible") void request();
	};
	void request();
	document.addEventListener("visibilitychange", onVisible);
	return {
		release: () => {
			released = true;
			document.removeEventListener("visibilitychange", onVisible);
			void sentinel?.release();
			sentinel = null;
		},
	};
}

// Keep the screen awake while `active` (prep countdown + attempt), releasing when
// it clears or the component unmounts.
export function useWakeLock(active: boolean) {
	useEffect(() => {
		if (!active) return;
		const handle = keepAwake();
		return () => handle.release();
	}, [active]);
}
