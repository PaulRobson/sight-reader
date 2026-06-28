import abcjs, { type TuneObject } from "abcjs";
import { useEffect, useRef } from "react";
import { barsPerLine } from "../lib/barsPerLine.ts";
import { debounce } from "../lib/debounce.ts";
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
		const el = scoreRef.current;
		if (!el) return;
		// Wrap by measures so higher grades break onto multiple lines instead of
		// squeezing every bar onto one shrinking line (§9). staffwidth seeds the
		// line-breaking; responsive then scales the result to the container. abcjs
		// lays out to a fixed width per call, so a viewport change needs a genuine
		// re-render, not just CSS scaling (§9) — debounced so a resize/orientation
		// drag collapses to one re-layout.
		const render = () => {
			const width = el.clientWidth || 720;
			const finePointer =
				window.matchMedia?.("(pointer: fine)").matches ?? false;
			const tunes = abcjs.renderAbc(el, abc, {
				responsive: "resize",
				staffwidth: width,
				wrap: {
					minSpacing: 1.8,
					maxSpacing: 2.7,
					preferredMeasuresPerLine: barsPerLine(width, finePointer),
				},
			});
			visualObjRef.current = tunes[0] ?? null;
		};
		render();
		const onResize = debounce(render, 150);
		window.addEventListener("resize", onResize);
		window.addEventListener("orientationchange", onResize);
		return () => {
			onResize.cancel();
			window.removeEventListener("resize", onResize);
			window.removeEventListener("orientationchange", onResize);
		};
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
