import { useViewState, type View } from "./lib/useViewState.ts";

const labels: Record<View, string> = {
	settings: "Settings",
	prep: "Prep countdown",
	playNow: "PLAY NOW!",
	assess: "Self-assessment",
	history: "History",
};

export default function App() {
	const [view, dispatch] = useViewState();
	return (
		<main>
			<h1>Sight-Reading Trainer</h1>
			<section aria-label={view}>
				<p>{labels[view]}</p>
			</section>
			<nav>
				<button type="button" onClick={() => dispatch({ type: "start" })}>
					Let's go
				</button>
				<button
					type="button"
					onClick={() => dispatch({ type: "countdownDone" })}
				>
					Begin
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
