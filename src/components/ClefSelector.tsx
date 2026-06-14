import {
	type Clef,
	type InstrumentDef,
	isGrandStaff,
} from "../lib/instruments.ts";

const CLEF_LABELS: Record<Clef, string> = {
	treble: "Treble",
	bass: "Bass",
	alto: "Alto",
	tenor: "Tenor",
};

type Props = {
	instrument: InstrumentDef;
	value: Clef;
	onChange: (clef: Clef) => void;
};

export function ClefSelector({ instrument, value, onChange }: Props) {
	if (isGrandStaff(instrument)) {
		return <p className="clef-selector">Grand staff (treble + bass)</p>;
	}
	return (
		<label className="clef-selector">
			Clef
			<select value={value} onChange={(e) => onChange(e.target.value as Clef)}>
				{instrument.clefs.map((c) => (
					<option key={c} value={c}>
						{CLEF_LABELS[c]}
					</option>
				))}
			</select>
		</label>
	);
}
