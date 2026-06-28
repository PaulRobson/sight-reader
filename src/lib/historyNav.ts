import type { Dispatch } from "react";
import type { View, ViewEvent } from "./useViewState.ts";

// Whether the history panel is showing, plus a toggle: open it (closing the
// settings panel first) or, when already open, close it.
export function historyNav(
	view: View,
	settingsOpen: boolean,
	setSettingsOpen: (open: boolean) => void,
	dispatch: Dispatch<ViewEvent>,
): { inHistory: boolean; toggleHistory: () => void } {
	const inHistory = view === "history" && !settingsOpen;
	return {
		inHistory,
		toggleHistory() {
			if (inHistory) return dispatch({ type: "closeHistory" });
			setSettingsOpen(false);
			dispatch({ type: "openHistory" });
		},
	};
}
