type Props = {
	label: string;
	checked: boolean;
	onChange: (on: boolean) => void;
};

export function Toggle({ label, checked, onChange }: Props) {
	return (
		<label className="toggle">
			<input
				type="checkbox"
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
			/>
			{label}
		</label>
	);
}
