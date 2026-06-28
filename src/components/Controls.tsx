type Props = { onStart: () => void };

export function Controls({ onStart }: Props) {
	return (
		<nav>
			<button type="button" className="primary" onClick={onStart}>
				Let's go
			</button>
		</nav>
	);
}
