export function formatRelativeShort(date: Date | string | null): string {
	if (!date) return "";
	const d = typeof date === "string" ? new Date(date) : date;
	const diffMs = Date.now() - d.getTime();
	const diffMin = Math.floor(diffMs / 60_000);

	if (diffMin < 1) return "agora";
	if (diffMin < 60) return `${diffMin}m`;

	const diffHours = Math.floor(diffMin / 60);
	if (diffHours < 24) return `${diffHours}h`;

	const diffDays = Math.floor(diffHours / 24);
	if (diffDays === 1) return "ontem";
	if (diffDays < 7) return `${diffDays}d`;

	const day = String(d.getDate()).padStart(2, "0");
	const month = String(d.getMonth() + 1).padStart(2, "0");
	return `${day}/${month}`;
}
