import { useCallback, useRef } from "react";
import type { BeatSpec } from "./beatSpecFromAbc.ts";

const LOOKAHEAD_MS = 25; // scheduler wake interval
const SCHEDULE_AHEAD_S = 0.12; // how far ahead clicks are queued
const CLICK_S = 0.04; // click envelope length

// Schedule ahead via Web Audio time (not setInterval timing) so clicks stay
// sample-accurate; setInterval only refills the queue.
function click(ctx: AudioContext, time: number, accent: boolean) {
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.frequency.value = accent ? 1600 : 1000;
	gain.gain.setValueAtTime(accent ? 0.5 : 0.3, time);
	gain.gain.exponentialRampToValueAtTime(0.0001, time + CLICK_S);
	osc.connect(gain).connect(ctx.destination);
	osc.start(time);
	osc.stop(time + CLICK_S);
}

// Attempt metronome (§7): a one-bar count-in (accented downbeat, plain clicks
// after) that then stops, so the student plays the piece unaccompanied.
// arm() must run inside a user gesture (Let's go) to unlock iOS audio, because
// start() fires at the countdown-zero transition, which is not a gesture.
export function useMetronome() {
	const ctxRef = useRef<AudioContext | null>(null);
	const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(
		undefined,
	);

	const arm = useCallback(() => {
		ctxRef.current ??= new AudioContext();
		ctxRef.current.resume().catch(() => undefined);
	}, []);

	const stop = useCallback(() => {
		if (timerRef.current !== undefined) {
			clearInterval(timerRef.current);
			timerRef.current = undefined;
		}
	}, []);

	const start = useCallback(
		(spec: BeatSpec) => {
			const ctx = ctxRef.current;
			if (!ctx) return;
			stop();
			ctx.resume().catch(() => undefined);
			let beat = 0;
			let next = ctx.currentTime + 0.1;
			// One bar only: queue beats 0..beatsPerBar-1, then stop the scheduler.
			// Already-queued clicks still sound on the audio clock after stop().
			const tick = () => {
				while (
					beat < spec.beatsPerBar &&
					next < ctx.currentTime + SCHEDULE_AHEAD_S
				) {
					click(ctx, next, beat === 0);
					next += spec.secondsPerBeat;
					beat += 1;
				}
				if (beat >= spec.beatsPerBar) stop();
			};
			tick();
			timerRef.current = setInterval(tick, LOOKAHEAD_MS);
		},
		[stop],
	);

	return { arm, start, stop };
}
