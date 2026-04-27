import { db, sql } from "@repo/database";

async function main() {
	const rows = (
		await db.execute(sql`
		SELECT id, title, "startAt", "calendarId", "organizationId"
		FROM calendar_event
		ORDER BY "createdAt" DESC LIMIT 5
	`)
	).rows;
	console.log(JSON.stringify(rows, null, 2));
	process.exit(0);
}
main().catch((err) => {
	console.error(err);
	process.exit(1);
});
