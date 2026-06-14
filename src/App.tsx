import { useState } from "react";
import { Countdown } from "./components/Countdown.tsx";
import { ExerciseView } from "./components/ExerciseView.tsx";
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
	const [abc, setAbc] = useState(() => defaultPiece());

	function letsGo() {
		setAbc(defaultPiece(Date.now())); // fresh seed -> fresh piece
		dispatch({ type: "start" });
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
			<nav>
				<button type="button" onClick={letsGo}>
					Let's go
				</button>
				<button
					type="button"
					onClick={() => dispatch({ type: "finishAttempt" })}
				>
					Finish attempt
				</button>
				<button type="button" onClick={() => dispatch({ type: "saveAttempt" })}>
					Save
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
