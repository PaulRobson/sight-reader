import { instruments } from "../lib/instruments.ts";

type Props = { value: string; onChange: (instrumentId: string) => void };

export function InstrumentPicker({ value, onChange }: Props) {
	return (
		<label className="instrument-picker">
			Instrument
			<select value={value} onChange={(e) => onChange(e.target.value)}>
				{instruments.map((i) => (
					<option key={i.id} value={i.id}>
						{i.name}
					</option>
				))}
			</select>
		</label>
	);
}
