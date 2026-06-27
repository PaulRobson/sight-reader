import { useReducer } from "react";

export type View = "settings" | "prep" | "playNow" | "assess" | "history";

export type ViewEvent =
	| { type: "start" } // settings -> prep ("Let's go")
	| { type: "countdownDone" } // prep -> playNow (countdown zero / skip)
	| { type: "finishAttempt" } // playNow -> assess (student finished)
	| { type: "saveAttempt" } // assess -> settings (saved; ready for next)
	| { type: "openHistory" } // -> history
	| { type: "closeHistory" }; // history -> settings

const transitions: Record<View, Partial<Record<ViewEvent["type"], View>>> = {
	settings: { openHistory: "history" },
	prep: { countdownDone: "playNow" },
	playNow: { finishAttempt: "assess" },
	assess: { saveAttempt: "settings", openHistory: "history" },
	history: { closeHistory: "settings" },
};

// "Let's go" is a universal restart: from any view it begins a fresh prep
// countdown. Other events follow the per-view map; an invalid event is a no-op.
export function viewReducer(view: View, event: ViewEvent): View {
	if (event.type === "start") return "prep";
	return transitions[view][event.type] ?? view;
}

export function useViewState(initial: View = "settings") {
	return useReducer(viewReducer, initial);
}
