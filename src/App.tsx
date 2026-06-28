import { useState } from "react";
import { AppHeader } from "./components/AppHeader.tsx";
import { AssessmentForm } from "./components/AssessmentForm.tsx";
import { Controls } from "./components/Controls.tsx";
import { Countdown } from "./components/Countdown.tsx";
import { ExerciseView } from "./components/ExerciseView.tsx";
import { HistoryView } from "./components/HistoryView.tsx";
import { SettingsPanel } from "./components/SettingsPanel.tsx";
import { historyNav } from "./lib/historyNav.ts";
import { keyLabel } from "./lib/keyLabel.ts";
import { midiTransposeForInstrument } from "./lib/midiTransposeForInstrument.ts";
import { useAttemptMetronome } from "./lib/useAttemptMetronome.ts";
import { useAttemptSession } from "./lib/useAttemptSession.ts";
import { useSettings } from "./lib/useSettings.ts";
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
	const { settings, update, firstRun } = useSettings();
	const [settingsOpen, setSettingsOpen] = useState(firstRun);
	const { seed, abc, grade, logs, start, saveAttempt } = useAttemptSession(
		settings,
		dispatch,
	);
	const armMetronome = useAttemptMetronome(
		view,
		abc,
		settings.metronomeOnAttempt,
	);

	// Arm inside the gesture so iOS unlocks audio (§9); the count-in fires later
	// at the countdown-zero transition, which is not itself a gesture.
	function handleStart() {
		armMetronome();
		start();
	}

	const { inHistory, toggleHistory } = historyNav(
		view,
		settingsOpen,
		setSettingsOpen,
		dispatch,
	);

	return (
		<main>
			<AppHeader
				settingsOpen={settingsOpen}
				onToggleSettings={() => setSettingsOpen((open) => !open)}
				inHistory={inHistory}
				onToggleHistory={toggleHistory}
			/>
			{settingsOpen ? (
				<SettingsPanel settings={settings} update={update} />
			) : inHistory ? (
				<HistoryView logs={logs} />
			) : (
				<>
					{view !== "settings" ? (
						<section className="view-label" aria-label={view}>
							<p>{labels[view]}</p>
						</section>
					) : null}
					<ExerciseView
						abc={abc}
						midiTranspose={midiTransposeForInstrument(settings.instrumentId)}
					/>
					{view === "prep" ? (
						<Countdown
							key={seed}
							seconds={settings.countdownSeconds}
							onDone={() => dispatch({ type: "countdownDone" })}
						/>
					) : null}
					{view === "playNow" ? (
						<section className="play-now-banner" aria-label="play now">
							PLAY NOW!
						</section>
					) : null}
					{view === "assess" ? (
						<AssessmentForm
							pieceId={`piece-${seed}`}
							grade={grade}
							keyName={keyLabel(abc) ?? ""}
							onSubmit={saveAttempt}
						/>
					) : null}
					<Controls onStart={handleStart} dispatch={dispatch} />
				</>
			)}
		</main>
	);
}
