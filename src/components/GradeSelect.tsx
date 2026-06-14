const GRADES = [1, 2, 3, 4, 5, 6, 7, 8];

type Props = { value: number; onChange: (grade: number) => void };

export function GradeSelect({ value, onChange }: Props) {
	return (
		<label className="grade-select">
			Grade
			<select value={value} onChange={(e) => onChange(Number(e.target.value))}>
				{GRADES.map((g) => (
					<option key={g} value={g}>
						{g}
					</option>
				))}
			</select>
		</label>
	);
}
