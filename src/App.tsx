import { useState } from "react";
import { AppHeader } from "./components/AppHeader.tsx";
import { AttemptScreen } from "./components/AttemptScreen.tsx";
import { HistoryView } from "./components/HistoryView.tsx";
import { SettingsPanel } from "./components/SettingsPanel.tsx";
import { historyNav } from "./lib/historyNav.ts";
import { useAttemptMetronome } from "./lib/useAttemptMetronome.ts";
import { useAttemptSession } from "./lib/useAttemptSession.ts";
import { useSettings } from "./lib/useSettings.ts";
import { useViewState } from "./lib/useViewState.ts";

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
				<AttemptScreen
					view={view}
					abc={abc}
					seed={seed}
					grade={grade}
					settings={settings}
					dispatch={dispatch}
					onStart={handleStart}
					onSaveAttempt={saveAttempt}
				/>
			)}
		</main>
	);
}
