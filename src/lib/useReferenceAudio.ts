import abcjs, { type TuneObject } from "abcjs";
import { useRef, useState } from "react";

export type AudioStatus = "unsupported" | "idle" | "priming" | "playing";

// Wraps abcjs CreateSynth: init -> prime -> start. The AudioContext is created
// and resumed inside the play handler so the user gesture unlocks audio (iOS).
export function useReferenceAudio(getVisualObj: () => TuneObject | null) {
	const supported = abcjs.synth.supportsAudio();
	const [status, setStatus] = useState<AudioStatus>(
		supported ? "idle" : "unsupported",
	);
	const ctxRef = useRef<AudioContext | null>(null);

	async function play() {
		const visualObj = getVisualObj();
		if (!supported || !visualObj || status === "priming") return;
		setStatus("priming");
		try {
			ctxRef.current ??= new AudioContext();
			await ctxRef.current.resume();
			const synth = new abcjs.synth.CreateSynth();
			await synth.init({
				audioContext: ctxRef.current,
				visualObj,
				onEnded: () => setStatus("idle"),
			});
			await synth.prime();
			synth.start();
			setStatus("playing");
		} catch {
			setStatus("idle");
		}
	}

	return { status, play };
}
