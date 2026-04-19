import { baileysManager } from "@repo/whatsapp";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Idempotente — chamadas múltiplas não religam instâncias já ativas.
let bootPromise: Promise<void> | null = null;

/**
 * Ergue todas as WhatsApp instances que estavam conectadas/desconectadas
 * quando o processo Node subiu. Use GET manualmente após deploy, ou adicione
 * cron de healthcheck pra garantir que reconexões aconteçam.
 */
export async function GET() {
	if (!bootPromise) {
		bootPromise = baileysManager.bootAll().catch((err) => {
			console.error("[api/system/boot] bootAll error", err);
			bootPromise = null; // permite retry em caso de erro
			throw err;
		});
	}

	try {
		await bootPromise;
		return NextResponse.json({ ok: true });
	} catch (err) {
		return NextResponse.json(
			{
				ok: false,
				error: err instanceof Error ? err.message : "boot failed",
			},
			{ status: 500 },
		);
	}
}
