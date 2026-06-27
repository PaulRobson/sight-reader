import { useState } from "react";
import { AssessmentForm } from "./components/AssessmentForm.tsx";
import { Controls } from "./components/Controls.tsx";
import { Countdown } from "./components/Countdown.tsx";
import { ExerciseView } from "./components/ExerciseView.tsx";
import { HistoryView } from "./components/HistoryView.tsx";
import { SettingsPanel } from "./components/SettingsPanel.tsx";
import { findInstrument } from "./lib/instruments.ts";
import { transposition } from "./lib/transposition.ts";
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

// Sounding-pitch transpose for the synth (§6); the score stays at written pitch.
function midiTransposeForInstrument(instrumentId: string): number {
	return transposition.synthMidiTranspose(findInstrument(instrumentId));
}

export default function App() {
	const [view, dispatch] = useViewState();
	const { settings, update, firstRun } = useSettings();
	const [settingsOpen, setSettingsOpen] = useState(firstRun);
	const { seed, abc, grade, logs, start, saveAttempt } = useAttemptSession(
		settings,
		dispatch,
	);

	return (
		<main>
			<header className="app-header">
				<h1>Sight-Reading Trainer</h1>
				<button
					type="button"
					className={settingsOpen ? "primary" : undefined}
					aria-expanded={settingsOpen}
					onClick={() => setSettingsOpen((open) => !open)}
				>
					{settingsOpen ? "Save settings" : "Settings"}
				</button>
			</header>
			{settingsOpen ? (
				<SettingsPanel settings={settings} update={update} />
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
							onSubmit={saveAttempt}
						/>
					) : null}
					{view === "history" ? <HistoryView logs={logs} /> : null}
					<Controls onStart={start} dispatch={dispatch} />
				</>
			)}
		</main>
	);
}
