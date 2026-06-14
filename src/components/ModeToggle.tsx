import type { Mode } from "../lib/useSettings.ts";

const MODES: { value: Mode; label: string }[] = [
	{ value: "melodic", label: "Melodic" },
	{ value: "rhythm-only", label: "Rhythm only" },
];

type Props = { value: Mode; onChange: (mode: Mode) => void };

export function ModeToggle({ value, onChange }: Props) {
	return (
		<fieldset className="mode-toggle">
			<legend>Mode</legend>
			{MODES.map((m) => (
				<label key={m.value}>
					<input
						type="radio"
						name="mode"
						checked={value === m.value}
						onChange={() => onChange(m.value)}
					/>
					{m.label}
				</label>
			))}
		</fieldset>
	);
}
