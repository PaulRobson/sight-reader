type Props = {
	settingsOpen: boolean;
	onToggleSettings: () => void;
	inHistory: boolean;
	onToggleHistory: () => void;
};

export function AppHeader({
	settingsOpen,
	onToggleSettings,
	inHistory,
	onToggleHistory,
}: Props) {
	return (
		<header className="app-header">
			<h1>Sight-Reading Trainer</h1>
			<div className="app-header-actions">
				<button
					type="button"
					className={inHistory ? "primary" : undefined}
					aria-pressed={inHistory}
					onClick={onToggleHistory}
				>
					History
				</button>
				<button
					type="button"
					className={settingsOpen ? "primary" : undefined}
					aria-expanded={settingsOpen}
					onClick={onToggleSettings}
				>
					{settingsOpen ? "Save settings" : "Settings"}
				</button>
			</div>
		</header>
	);
}
