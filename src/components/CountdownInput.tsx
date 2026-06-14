type Props = { value: number; onChange: (seconds: number) => void };

export function CountdownInput({ value, onChange }: Props) {
	return (
		<label className="countdown-input">
			Countdown (seconds, 0 = skip)
			<input
				type="number"
				min={0}
				value={value}
				onChange={(e) =>
					onChange(Math.max(0, Math.floor(Number(e.target.value) || 0)))
				}
			/>
		</label>
	);
}
