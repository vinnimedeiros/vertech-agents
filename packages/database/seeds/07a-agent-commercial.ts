/**
 * Seed Phase 07A.8 — Cria um agente comercial de teste + publica versao inicial.
 *
 * Uso:
 *   pnpm --filter @repo/database exec tsx seeds/07a-agent-commercial.ts
 *
 * Requer .env.local com DATABASE_URL apontando pro Supabase.
 *
 * Idempotente: se ja existe agente com name="Atendente Comercial Vertech"
 * na org do Vinni, nao cria duplicado — retorna o existente.
 *
 * Proximo passo: vincular a WhatsApp com `link-agent-to-whatsapp.ts`.
 */
import {
	agent,
	agentVersion,
	and,
	db,
	eq,
	member,
	organization,
	user,
} from "../drizzle";

const AGENT_NAME = "Atendente Comercial Vertech";
const SUPERADMIN_EMAIL =
	process.env.SUPERADMIN_EMAIL ?? "vinni@vertech-agents.com";

async function main() {
	console.log("[seed] Phase 07A.8 — criando agente comercial de teste");

	// 1. Encontrar o user superadmin (Vinni)
	const [vinni] = await db
		.select({ id: user.id, email: user.email })
		.from(user)
		.where(eq(user.email, SUPERADMIN_EMAIL))
		.limit(1);

	if (!vinni) {
		throw new Error(
			`User com email ${SUPERADMIN_EMAIL} nao encontrado. Ajuste SUPERADMIN_EMAIL env var.`,
		);
	}

	console.log(`[seed] user encontrado: ${vinni.email} (${vinni.id})`);

	// 2. Encontrar a primeira org do Vinni que seja CLIENT (o agente vive num CLIENT)
	const [org] = await db
		.select({
			id: organization.id,
			name: organization.name,
			type: organization.organizationType,
		})
		.from(member)
		.innerJoin(organization, eq(member.organizationId, organization.id))
		.where(
			and(
				eq(member.userId, vinni.id),
				eq(organization.organizationType, "CLIENT"),
			),
		)
		.limit(1);

	if (!org) {
		throw new Error(
			`Nenhuma org CLIENT encontrada pro user ${vinni.email}. Crie uma org CLIENT antes do seed.`,
		);
	}

	console.log(`[seed] org CLIENT encontrada: ${org.name} (${org.id})`);

	// 3. Verificar se agente ja existe (idempotencia)
	const [existing] = await db
		.select({ id: agent.id, status: agent.status })
		.from(agent)
		.where(and(eq(agent.organizationId, org.id), eq(agent.name, AGENT_NAME)))
		.limit(1);

	if (existing) {
		console.log(
			`[seed] agente ja existe: ${existing.id} (status: ${existing.status})`,
		);
		console.log(
			"[seed] pra testar, rode: pnpm --filter @repo/database exec tsx seeds/link-agent-to-whatsapp.ts <instanceId>",
		);
		return existing.id;
	}

	// 4. Criar agente
	const now = new Date();
	const [created] = await db
		.insert(agent)
		.values({
			organizationId: org.id,
			name: AGENT_NAME,
			role: "Atendimento comercial",
			avatarUrl: null,
			gender: "NEUTRAL",
			description:
				"Agente de teste criado pela Phase 07A.8 seed. Sem tools (07A) — somente conversa.",
			model: "openai/gpt-4.1-mini",
			temperature: 0.7,
			maxSteps: 10,
			personality: {
				tone: "semiformal",
				formality: "voce_sem_girias",
				humor: "leve",
				empathyLevel: "alta",
			},
			businessContext: {
				industry: "Solucoes empresariais (SaaS + consultoria)",
				products:
					"Sistemas integrados de gestao com IA, automacao de vendas, atendimento inteligente. Detalhes sob consulta.",
				pricing:
					"Sob consulta — NUNCA inventar valores. Sempre encaminhar pedidos de preco pro humano.",
				policies:
					"LGPD-compliant. Respeitar opt-out imediato. Nao fornecer dados de outros clientes.",
				inviolableRules: [
					"Nunca prometer precos sem consultar humano",
					"Nunca identificar-se como IA a menos que o lead pergunte diretamente",
					"Nunca fornecer informacoes de outros clientes ou projetos",
				],
			},
			conversationStyle: {
				greeting:
					"cumprimento natural, identifica-se pelo nome, pergunta nome do lead",
				qualificationQuestions: [
					"Qual o tamanho da empresa?",
					"Qual a dor principal que voces querem resolver?",
					"Ja usam algum sistema de gestao hoje?",
				],
				objectionHandling:
					"Acolher duvidas com empatia. Nunca pressionar. Oferecer encaminhar pra humano quando a conversa fica tecnica.",
				handoffTriggers: [
					"Lead pede pra falar com humano",
					"Lead pergunta sobre valores especificos",
					"Situacao ficou sensivel ou delicada",
					"Lead demonstra frustracao",
				],
			},
			instructions: null, // usa template de buildInstructions
			enabledTools: [], // Phase 08 populara com commercialTools
			knowledgeDocIds: [],
			status: "ACTIVE",
			version: 1,
			whatsappInstanceId: null, // vinculado via link-agent-to-whatsapp.ts
			createdAt: now,
			updatedAt: now,
			publishedAt: now,
		})
		.returning({ id: agent.id });

	// 5. Criar snapshot de versao inicial
	await db.insert(agentVersion).values({
		agentId: created.id,
		version: 1,
		snapshot: {
			name: AGENT_NAME,
			role: "Atendimento comercial",
			model: "openai/gpt-4.1-mini",
			temperature: 0.7,
			maxSteps: 10,
			personality: {
				tone: "semiformal",
				formality: "voce_sem_girias",
				humor: "leve",
				empathyLevel: "alta",
			},
			businessContext: {
				industry: "Solucoes empresariais (SaaS + consultoria)",
				products: "Sistemas integrados de gestao com IA",
				pricing: "Sob consulta",
				policies: "LGPD-compliant. Respeitar opt-out.",
				inviolableRules: [
					"Nunca prometer precos sem consultar humano",
					"Nunca identificar-se como IA a menos que perguntem",
				],
			},
			conversationStyle: {
				greeting: "cumprimento natural",
				qualificationQuestions: [],
				objectionHandling: "empatia",
				handoffTriggers: ["pedido explicito", "valores", "situacao delicada"],
			},
			enabledTools: [],
			knowledgeDocIds: [],
			version: 1,
			publishedAt: now.toISOString(),
		},
		createdByUserId: vinni.id,
		createdAt: now,
	});

	console.log(`[seed] ✅ agente criado: ${created.id}`);
	console.log("");
	console.log("proximos passos pra testar:");
	console.log(
		`1. listar instancias WhatsApp: SELECT id, "displayName", status FROM whatsapp_instance WHERE "organizationId" = '${org.id}';`,
	);
	console.log(
		`2. vincular: pnpm --filter @repo/database exec tsx seeds/link-agent-to-whatsapp.ts ${created.id} <instanceId>`,
	);
	console.log(
		`3. ligar IA numa conversa: pnpm --filter @repo/database exec tsx seeds/enable-ai-on-conversation.ts <conversationId> ${created.id}`,
	);
	console.log("4. mandar mensagem do celular pro numero vinculado");

	return created.id;
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error("[seed] falhou:", err);
		process.exit(1);
	});
