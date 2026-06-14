import { useState } from "react";
import { AssessmentForm } from "./components/AssessmentForm.tsx";
import { Countdown } from "./components/Countdown.tsx";
import { ExerciseView } from "./components/ExerciseView.tsx";
import { HistoryView } from "./components/HistoryView.tsx";
import type { AttemptLog } from "./lib/assessment.ts";
import { attempts } from "./lib/attempts.ts";
import { defaultPiece } from "./lib/defaultPiece.ts";
import { useViewState, type View } from "./lib/useViewState.ts";

const COUNTDOWN_SECONDS = 60; // default; configurable in Slice 3 settings

const labels: Record<View, string> = {
	settings: "Settings",
	prep: "Prep countdown",
	playNow: "PLAY NOW!",
	assess: "Self-assessment",
	history: "History",
};

export default function App() {
	const [view, dispatch] = useViewState();
	const [seed, setSeed] = useState(1);
	const [abc, setAbc] = useState(() => defaultPiece());

	function start(nextSeed: number) {
		setSeed(nextSeed);
		setAbc(defaultPiece(nextSeed));
		dispatch({ type: "start" });
	}

	function saveAttempt(log: AttemptLog) {
		attempts.save(log);
		dispatch({ type: "saveAttempt" });
	}

	return (
		<main>
			<h1>Sight-Reading Trainer</h1>
			<section aria-label={view}>
				<p>{labels[view]}</p>
			</section>
			<ExerciseView abc={abc} />
			{view === "prep" ? (
				<Countdown
					seconds={COUNTDOWN_SECONDS}
					onDone={() => dispatch({ type: "countdownDone" })}
				/>
			) : null}
			{view === "playNow" ? (
				<section className="play-now-banner" aria-label="play now">
					PLAY NOW!
				</section>
			) : null}
			{view === "assess" ? (
				<AssessmentForm pieceId={`piece-${seed}`} onSubmit={saveAttempt} />
			) : null}
			{view === "history" ? <HistoryView logs={attempts.all()} /> : null}
			<nav>
				<button type="button" onClick={() => start(Date.now())}>
					Let's go
				</button>
				<button type="button" onClick={() => start(seed)}>
					Try again (same piece)
				</button>
				<button type="button" onClick={() => start(Date.now())}>
					New piece
				</button>
				<button
					type="button"
					onClick={() => dispatch({ type: "finishAttempt" })}
				>
					Finish attempt
				</button>
				<button type="button" onClick={() => dispatch({ type: "openHistory" })}>
					History
				</button>
				<button
					type="button"
					onClick={() => dispatch({ type: "closeHistory" })}
				>
					Back
				</button>
			</nav>
		</main>
	);
}
