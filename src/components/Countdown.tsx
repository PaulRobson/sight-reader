import { useCountdown } from "../lib/useCountdown.ts";

type Props = { seconds: number; onDone: () => void };

export function Countdown({ seconds, onDone }: Props) {
	const { remaining, skip } = useCountdown(seconds, onDone);
	return (
		<section className="countdown" aria-label="prep countdown">
			<p className="countdown-value">{remaining}</p>
			<button type="button" onClick={skip}>
				Skip
			</button>
		</section>
	);
}
