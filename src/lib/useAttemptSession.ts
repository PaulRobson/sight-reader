import { useState } from "react";
import type { AttemptLog } from "./assessment.ts";
import { attempts } from "./attempts.ts";
import { defaultPiece } from "./defaultPiece.ts";
import { pieceForSettings } from "./pieceForSettings.ts";
import type { Settings } from "./useSettings.ts";
import type { ViewEvent } from "./useViewState.ts";

// Holds the piece the student is reading plus the grade it was generated at, so
// a mid-attempt settings change can't retroactively alter a logged attempt.
export function useAttemptSession(
	settings: Settings,
	dispatch: (event: ViewEvent) => void,
) {
	const [seed, setSeed] = useState(1);
	const [abc, setAbc] = useState(() => defaultPiece());
	const [grade, setGrade] = useState(settings.grade);

	function start() {
		const nextSeed = Date.now();
		setSeed(nextSeed);
		setAbc(pieceForSettings(settings, nextSeed));
		setGrade(settings.grade);
		dispatch({ type: "start" });
	}

	function saveAttempt(log: AttemptLog) {
		attempts.save(log);
		dispatch({ type: "saveAttempt" });
	}

	return { seed, abc, grade, logs: attempts.all(), start, saveAttempt };
}
