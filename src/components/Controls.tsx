import type { Dispatch } from "react";
import type { ViewEvent } from "../lib/useViewState.ts";

type Props = {
	seed: number;
	onStart: (seed: number) => void;
	dispatch: Dispatch<ViewEvent>;
};

export function Controls({ seed, onStart, dispatch }: Props) {
	return (
		<nav>
			<button
				type="button"
				className="primary"
				onClick={() => onStart(Date.now())}
			>
				Let's go
			</button>
			<button type="button" onClick={() => onStart(seed)}>
				Try again (same piece)
			</button>
			<button type="button" onClick={() => onStart(Date.now())}>
				New piece
			</button>
			<button type="button" onClick={() => dispatch({ type: "finishAttempt" })}>
				Finish attempt
			</button>
			<button type="button" onClick={() => dispatch({ type: "openHistory" })}>
				History
			</button>
			<button type="button" onClick={() => dispatch({ type: "closeHistory" })}>
				Back
			</button>
		</nav>
	);
}
