type Props = { onStart: () => void };

// Only shown once a piece is on screen, so the restart reads as "regenerate".
export function Controls({ onStart }: Props) {
	return (
		<nav>
			<button type="button" className="primary" onClick={onStart}>
				New piece
			</button>
		</nav>
	);
}
