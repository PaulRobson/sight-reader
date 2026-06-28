import { useCallback, useEffect } from "react";
import { beatSpecFromAbc } from "./beatSpecFromAbc.ts";
import { useMetronome } from "./useMetronome.ts";
import type { View } from "./useViewState.ts";

// Drives the attempt metronome (§7) from view state: on entering playNow it
// plays a one-bar count-in (when enabled), and the cleanup stops it if the view
// leaves mid-count. Returns arm(), which the caller invokes inside the Let's go
// gesture so iOS audio is unlocked before the start() that fires at the
// (non-gesture) countdown-zero transition.
export function useAttemptMetronome(
	view: View,
	abc: string,
	enabled: boolean,
): () => void {
	const { arm, start, stop } = useMetronome();
	useEffect(() => {
		if (view !== "playNow" || !enabled) return;
		const spec = beatSpecFromAbc(abc);
		if (spec) start(spec);
		return stop;
	}, [view, enabled, abc, start, stop]);
	return useCallback(() => {
		if (enabled) arm();
	}, [enabled, arm]);
}
