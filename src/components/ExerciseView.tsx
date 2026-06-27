import abcjs, { type TuneObject } from "abcjs";
import { useEffect, useRef } from "react";
import {
	type AudioStatus,
	useReferenceAudio,
} from "../lib/useReferenceAudio.ts";

type Props = { abc: string; midiTranspose: number };

const PLAY_LABELS: Record<AudioStatus, string> = {
	unsupported: "Audio unavailable",
	idle: "Play reference",
	priming: "Loading…",
	playing: "Stop",
};

export function ExerciseView({ abc, midiTranspose }: Props) {
	const scoreRef = useRef<HTMLDivElement>(null);
	const visualObjRef = useRef<TuneObject | null>(null);
	const { status, play, stop } = useReferenceAudio(
		() => visualObjRef.current,
		midiTranspose,
	);

	useEffect(() => {
		if (!scoreRef.current) return;
		// Wrap by measures so higher grades break onto multiple lines instead of
		// squeezing every bar onto one shrinking line (§9). staffwidth seeds the
		// line-breaking; responsive then scales the result to the container.
		const width = scoreRef.current.clientWidth || 720;
		const tunes = abcjs.renderAbc(scoreRef.current, abc, {
			responsive: "resize",
			staffwidth: width,
			wrap: { minSpacing: 1.8, maxSpacing: 2.7, preferredMeasuresPerLine: 4 },
		});
		visualObjRef.current = tunes[0] ?? null;
	}, [abc]);

	return (
		<section className="exercise">
			<div
				ref={scoreRef}
				className="score"
				role="img"
				aria-label="exercise score"
			/>
			<button
				type="button"
				className="play"
				onClick={status === "playing" ? stop : play}
				disabled={status === "unsupported" || status === "priming"}
			>
				{status === "priming" ? (
					<span className="spinner" aria-hidden="true" />
				) : null}
				{PLAY_LABELS[status]}
			</button>
		</section>
	);
}
