import type { Dispatch } from "react";
import type { ViewEvent } from "../lib/useViewState.ts";

type Props = {
	onStart: () => void;
	dispatch: Dispatch<ViewEvent>;
};

export function Controls({ onStart, dispatch }: Props) {
	return (
		<nav>
			<button type="button" className="primary" onClick={onStart}>
				Let's go
			</button>
			<button type="button" onClick={() => dispatch({ type: "finishAttempt" })}>
				Finish attempt
			</button>
		</nav>
	);
}
