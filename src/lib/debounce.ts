// Trailing-edge debounce: runs fn once `ms` after the last call, collapsing a
// burst (e.g. continuous resize/orientation events) into a single invocation.
// cancel() drops a pending call, for effect cleanup on unmount.
export function debounce<A extends unknown[]>(
	fn: (...args: A) => void,
	ms: number,
) {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const debounced = (...args: A) => {
		if (timer !== undefined) clearTimeout(timer);
		timer = setTimeout(() => {
			timer = undefined;
			fn(...args);
		}, ms);
	};
	debounced.cancel = () => {
		if (timer !== undefined) clearTimeout(timer);
		timer = undefined;
	};
	return debounced;
}
