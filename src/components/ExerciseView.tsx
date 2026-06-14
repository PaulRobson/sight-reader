import abcjs, { type TuneObject } from "abcjs";
import { useEffect, useRef } from "react";
import {
	type AudioStatus,
	useReferenceAudio,
} from "../lib/useReferenceAudio.ts";

type Props = { abc: string };

const PLAY_LABELS: Record<AudioStatus, string> = {
	unsupported: "Audio unavailable",
	idle: "Play reference",
	priming: "Loading…",
	playing: "Playing…",
};

export function ExerciseView({ abc }: Props) {
	const scoreRef = useRef<HTMLDivElement>(null);
	const visualObjRef = useRef<TuneObject | null>(null);
	const { status, play } = useReferenceAudio(() => visualObjRef.current);

	useEffect(() => {
		if (!scoreRef.current) return;
		const tunes = abcjs.renderAbc(scoreRef.current, abc, {
			responsive: "resize",
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
				onClick={play}
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
