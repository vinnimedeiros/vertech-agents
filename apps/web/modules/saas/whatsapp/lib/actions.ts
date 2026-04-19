"use server";

import { requireOrgAccess } from "@repo/auth";
import { db, eq, whatsappInstance } from "@repo/database";
import { getSession } from "@saas/auth/lib/server";
import { baileysManager } from "@repo/whatsapp";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createInstanceSchema = z.object({
	organizationId: z.string().min(1),
	name: z.string().trim().min(1, "Nome é obrigatório").max(80),
});

const idInput = z.object({
	instanceId: z.string().min(1),
});

async function requireAuthed() {
	const session = await getSession();
	if (!session?.user) throw new Error("UNAUTHENTICATED");
	return session.user;
}

async function assertInstanceAccess(userId: string, instanceId: string) {
	const [row] = await db
		.select({
			id: whatsappInstance.id,
			organizationId: whatsappInstance.organizationId,
		})
		.from(whatsappInstance)
		.where(eq(whatsappInstance.id, instanceId))
		.limit(1);
	if (!row) throw new Error("INSTANCE_NOT_FOUND");
	await requireOrgAccess(userId, row.organizationId);
	return row;
}

function revalidateIntegrations(slug: string) {
	revalidatePath(`/app/${slug}/crm/integracoes`, "page");
}

// ============================================================
// Criar instância + iniciar conexão (gera QR)
// ============================================================

export async function createInstanceAction(
	input: z.input<typeof createInstanceSchema>,
	organizationSlug: string,
) {
	const user = await requireAuthed();
	const data = createInstanceSchema.parse(input);
	await requireOrgAccess(user.id, data.organizationId);

	const now = new Date();
	const [created] = await db
		.insert(whatsappInstance)
		.values({
			organizationId: data.organizationId,
			name: data.name,
			status: "PENDING",
			createdAt: now,
			updatedAt: now,
		})
		.returning({ id: whatsappInstance.id });

	// Inicia imediatamente pra gerar QR
	baileysManager.startInstance(created.id).catch((err) => {
		console.error(
			"[createInstanceAction] startInstance failed",
			created.id,
			err,
		);
	});

	revalidateIntegrations(organizationSlug);
	return { instanceId: created.id };
}

// ============================================================
// Reiniciar conexão (usa auth salvo; se expirou, gera QR novo)
// ============================================================

export async function restartInstanceAction(
	input: z.input<typeof idInput>,
	organizationSlug: string,
) {
	const user = await requireAuthed();
	const data = idInput.parse(input);
	await assertInstanceAccess(user.id, data.instanceId);

	await baileysManager.destroyInstance(data.instanceId);

	// Reseta status pra PENDING enquanto o Baileys gera QR novo — caso
	// contrário o polling do popup mostraria o status anterior (LOGGED_OUT
	// ou DISCONNECTED) durante os segundos iniciais.
	await db
		.update(whatsappInstance)
		.set({
			status: "PENDING",
			lastQRCode: null,
			lastError: null,
			updatedAt: new Date(),
		})
		.where(eq(whatsappInstance.id, data.instanceId));

	baileysManager.startInstance(data.instanceId).catch((err) => {
		console.error(
			"[restartInstanceAction] startInstance failed",
			data.instanceId,
			err,
		);
	});

	revalidateIntegrations(organizationSlug);
}

// ============================================================
// Desconectar (logout) — requer QR novo pra reconectar
// ============================================================

export async function disconnectInstanceAction(
	input: z.input<typeof idInput>,
	organizationSlug: string,
) {
	const user = await requireAuthed();
	const data = idInput.parse(input);
	await assertInstanceAccess(user.id, data.instanceId);

	await baileysManager.stopInstance(data.instanceId);

	await db
		.update(whatsappInstance)
		.set({
			status: "LOGGED_OUT",
			phoneNumber: null,
			lastQRCode: null,
			authState: null,
			updatedAt: new Date(),
		})
		.where(eq(whatsappInstance.id, data.instanceId));

	revalidateIntegrations(organizationSlug);
}

// ============================================================
// Deletar instância (logout + remove do DB)
// ============================================================

export async function deleteInstanceAction(
	input: z.input<typeof idInput>,
	organizationSlug: string,
) {
	const user = await requireAuthed();
	const data = idInput.parse(input);
	await assertInstanceAccess(user.id, data.instanceId);

	await baileysManager.stopInstance(data.instanceId).catch(() => {});

	await db
		.delete(whatsappInstance)
		.where(eq(whatsappInstance.id, data.instanceId));

	revalidateIntegrations(organizationSlug);
}
