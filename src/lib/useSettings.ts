import { useState } from "react";
import type { Clef } from "./instruments.ts";
import { storage } from "./storage.ts";

// §2 Settings. Only instrumentId has a control so far; the remaining fields
// carry defaults until their Slice 3 controls land.
type Mode = "melodic" | "rhythm-only";

export type Settings = {
	instrumentId: string;
	clef: Clef;
	grade: number;
	mode: Mode;
	countdownSeconds: number;
	metronomeOnAttempt: boolean;
	referenceAvailableBeforeAttempt: boolean;
};

const KEY = "sr.settings";

const defaultSettings: Settings = {
	instrumentId: "piano",
	clef: "treble",
	grade: 1,
	mode: "melodic",
	countdownSeconds: 60,
	metronomeOnAttempt: true,
	referenceAvailableBeforeAttempt: false,
};

export function useSettings() {
	const [settings, setSettings] = useState<Settings>(() =>
		storage.load<Settings>(KEY, defaultSettings),
	);
	function update(patch: Partial<Settings>) {
		setSettings((s) => {
			const next = { ...s, ...patch };
			storage.save(KEY, next);
			return next;
		});
	}
	return { settings, update };
}
