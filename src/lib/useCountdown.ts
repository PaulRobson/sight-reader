import { useEffect, useRef, useState } from "react";

// Framework-agnostic countdown so the timing logic is unit-testable with fake
// timers. Ticks once per second; 0 seconds means "skip" (done immediately).
export function createCountdown(
	seconds: number,
	onTick: (remaining: number) => void,
	onDone: () => void,
): { skip: () => void; cancel: () => void } {
	let remaining = Math.max(0, Math.floor(seconds));
	let done = false;
	let id: ReturnType<typeof setInterval> | undefined;

	function finish() {
		if (done) return;
		done = true;
		if (id !== undefined) clearInterval(id);
		onTick(0);
		onDone();
	}

	if (remaining === 0) {
		finish();
	} else {
		onTick(remaining);
		id = setInterval(() => {
			remaining -= 1;
			if (remaining <= 0) finish();
			else onTick(remaining);
		}, 1000);
	}

	return {
		skip: finish,
		cancel() {
			done = true;
			if (id !== undefined) clearInterval(id);
		},
	};
}

export function useCountdown(seconds: number, onDone: () => void) {
	const [remaining, setRemaining] = useState(seconds);
	const onDoneRef = useRef(onDone);
	onDoneRef.current = onDone;
	const skipRef = useRef<(() => void) | undefined>(undefined);

	useEffect(() => {
		const c = createCountdown(seconds, setRemaining, () => onDoneRef.current());
		skipRef.current = c.skip;
		return c.cancel;
	}, [seconds]);

	return { remaining, skip: () => skipRef.current?.() };
}
