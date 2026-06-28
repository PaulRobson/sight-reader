type Props = { settingsOpen: boolean; onToggle: () => void };

export function AppHeader({ settingsOpen, onToggle }: Props) {
	return (
		<header className="app-header">
			<h1>Sight-Reading Trainer</h1>
			<button
				type="button"
				className={settingsOpen ? "primary" : undefined}
				aria-expanded={settingsOpen}
				onClick={onToggle}
			>
				{settingsOpen ? "Save settings" : "Settings"}
			</button>
		</header>
	);
}
