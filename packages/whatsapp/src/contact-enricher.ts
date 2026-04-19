import { contact, db, eq } from "@repo/database";
import type { WASocket } from "@whiskeysockets/baileys";

type BusinessProfile = {
	description?: string | null;
	category?: string | null;
	website?: string[] | null;
	business_hours?: {
		timezone?: string;
		business_config?: Array<{
			day_of_week: string;
			mode: string;
			open_time?: number;
			close_time?: number;
		}>;
	} | null;
} | null;

const DAY_PT: Record<string, string> = {
	MONDAY: "Seg",
	TUESDAY: "Ter",
	WEDNESDAY: "Qua",
	THURSDAY: "Qui",
	FRIDAY: "Sex",
	SATURDAY: "Sáb",
	SUNDAY: "Dom",
};

function minutesToHHMM(min: number): string {
	const h = Math.floor(min / 60) % 24;
	const m = min % 60;
	return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function formatHours(profile: BusinessProfile): string | null {
	const cfgs = profile?.business_hours?.business_config;
	if (!cfgs || cfgs.length === 0) return null;

	// Detecta "sempre aberto"
	const allOpen24 = cfgs.every((c) => c.mode === "OPEN_24H");
	if (allOpen24) return "Aberta 24 horas";

	const lines: string[] = [];
	for (const c of cfgs) {
		const day = DAY_PT[c.day_of_week] ?? c.day_of_week.slice(0, 3);
		if (c.mode === "OPEN_24H") {
			lines.push(`${day}: 24h`);
		} else if (c.mode === "CLOSED" || c.mode === "appointment_only") {
			lines.push(`${day}: fechado`);
		} else if (c.open_time != null && c.close_time != null) {
			lines.push(
				`${day}: ${minutesToHHMM(c.open_time)}-${minutesToHHMM(c.close_time)}`,
			);
		}
	}
	return lines.join(" · ");
}

/**
 * Busca foto de perfil e, se for WhatsApp Business, dados do business profile
 * (categoria, horário, site, descrição). Atualiza a row `contact` no DB em
 * background. Falhas são logadas mas não bloqueiam o fluxo de mensagem.
 */
export async function enrichContactFromWhatsApp(
	sock: WASocket,
	contactId: string,
	remoteJid: string,
): Promise<void> {
	const updates: Record<string, unknown> = {};

	// Foto de perfil (opcional — nem todo contato expõe)
	try {
		const url = await sock.profilePictureUrl(remoteJid, "image");
		if (url) updates.photoUrl = url;
	} catch {
		// Contato pode ter ocultado foto — ok
	}

	// Business profile
	try {
		const profile = (await sock.getBusinessProfile(
			remoteJid,
		)) as BusinessProfile;
		if (profile) {
			updates.isBusiness = true;
			if (profile.description) updates.businessDescription = profile.description;
			if (profile.category) updates.businessCategory = profile.category;
			if (profile.website && profile.website.length > 0) {
				updates.businessWebsite = profile.website[0];
			}
			const hours = formatHours(profile);
			if (hours) updates.businessHours = hours;
		} else {
			updates.isBusiness = false;
		}
	} catch {
		// Não é business ou erro de rede — ok
	}

	if (Object.keys(updates).length === 0) return;

	await db
		.update(contact)
		.set({ ...updates, updatedAt: new Date() })
		.where(eq(contact.id, contactId));
}
