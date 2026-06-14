import { constrainClef, findInstrument } from "../lib/instruments.ts";
import type { Settings } from "../lib/useSettings.ts";
import { ClefSelector } from "./ClefSelector.tsx";
import { CountdownInput } from "./CountdownInput.tsx";
import { GradeSelect } from "./GradeSelect.tsx";
import { InstrumentPicker } from "./InstrumentPicker.tsx";
import { ModeToggle } from "./ModeToggle.tsx";

type Props = {
	settings: Settings;
	update: (patch: Partial<Settings>) => void;
};

export function SettingsPanel({ settings, update }: Props) {
	return (
		<section className="settings-panel" aria-label="settings panel">
			<InstrumentPicker
				value={settings.instrumentId}
				onChange={(instrumentId) =>
					update({
						instrumentId,
						clef: constrainClef(findInstrument(instrumentId), settings.clef),
					})
				}
			/>
			<ClefSelector
				instrument={findInstrument(settings.instrumentId)}
				value={settings.clef}
				onChange={(clef) => update({ clef })}
			/>
			<GradeSelect
				value={settings.grade}
				onChange={(grade) => update({ grade })}
			/>
			<ModeToggle value={settings.mode} onChange={(mode) => update({ mode })} />
			<CountdownInput
				value={settings.countdownSeconds}
				onChange={(countdownSeconds) => update({ countdownSeconds })}
			/>
		</section>
	);
}
