import type { Dispatch } from "react";
import type { AttemptLog } from "../lib/assessment.ts";
import { keyLabel } from "../lib/keyLabel.ts";
import { midiTransposeForInstrument } from "../lib/midiTransposeForInstrument.ts";
import type { Settings } from "../lib/useSettings.ts";
import type { View, ViewEvent } from "../lib/useViewState.ts";
import { AssessmentForm } from "./AssessmentForm.tsx";
import { Controls } from "./Controls.tsx";
import { Countdown } from "./Countdown.tsx";
import { ExerciseView } from "./ExerciseView.tsx";

const labels: Partial<Record<View, string>> = {
	prep: "Prep countdown",
	playNow: "PLAY NOW!",
	assess: "Self-assessment",
};

type Props = {
	view: View;
	abc: string;
	seed: number;
	grade: number;
	settings: Settings;
	dispatch: Dispatch<ViewEvent>;
	onStart: () => void;
	onSaveAttempt: (log: AttemptLog) => void;
};

// The exercise side of the app: idle prompt before a piece is generated, then the
// score + per-state sections (countdown, PLAY NOW, assessment) once started.
export function AttemptScreen({
	view,
	abc,
	seed,
	grade,
	settings,
	dispatch,
	onStart,
	onSaveAttempt,
}: Props) {
	return (
		<>
			{labels[view] ? (
				<section className="view-label" aria-label={view}>
					<p>{labels[view]}</p>
				</section>
			) : null}
			{view === "settings" ? (
				<section className="start-prompt">
					<p>
						Press <strong>Let's go</strong> to start a new exercise.
					</p>
				</section>
			) : (
				<ExerciseView
					abc={abc}
					midiTranspose={midiTransposeForInstrument(settings.instrumentId)}
				/>
			)}
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
					onSubmit={onSaveAttempt}
				/>
			) : null}
			<Controls onStart={onStart} dispatch={dispatch} />
		</>
	);
}
