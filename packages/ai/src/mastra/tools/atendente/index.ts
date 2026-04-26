import { createTool } from "@mastra/core/tools";
import {
	and,
	calendar,
	calendarEvent,
	contact,
	conversation,
	db,
	desc,
	eq,
	inArray,
	lead,
	leadActivity,
	message,
	notInArray,
	pipeline,
	pipelineStage,
} from "@repo/database";
import { z } from "zod";
import { getLogger } from "../../logger";

const log = getLogger("tools/atendente");

/**
 * Tools core do Atendente — Roadmap V3 M2-01.
 *
 * 11 tools cobrindo qualificação, pipeline, agenda, conhecimento e handoff.
 * Cada tool tem schema Zod completo e execute. Tools que tocam tabelas
 * existentes são REAIS; tools que dependem de novas tabelas/services são
 * stubs Mastra-compliant (estrutura pronta, execute marcado como TODO).
 *
 * Multi-tenant: cada tool extrai `organizationId` do `requestContext`
 * pra isolar dados.
 *
 * Refs: docs/PROJECT-ROADMAP-V3.md (M2-01), Visão V3 (TIME 4 agentes).
 */

type ContextLike = { get: (key: string) => unknown } | undefined;

function requireOrgId(ctx: ContextLike): string {
	const orgId = ctx?.get?.("organizationId") as string | undefined;
	if (!orgId)
		throw new Error("requestContext.organizationId é obrigatório");
	return orgId;
}

function getAgentId(ctx: ContextLike): string | undefined {
	return ctx?.get?.("agentId") as string | undefined;
}

function isSandboxRun(ctx: ContextLike): boolean {
	return Boolean(ctx?.get?.("isSandbox"));
}

// ============================================================
// Helpers compartilhados — Wave 1 A.2 + A.7
// ============================================================

// Resolve pipeline ativo da org. Prefere `isDefault=true`. Se não houver
// flag setada, fallback pro primeiro pipeline da org (ordem de criação).
async function resolveOrgPipeline(
	organizationId: string,
	pipelineId?: string,
): Promise<{ id: string }> {
	if (pipelineId) {
		const explicit = await db.query.pipeline.findFirst({
			where: and(
				eq(pipeline.id, pipelineId),
				eq(pipeline.organizationId, organizationId),
			),
			columns: { id: true },
		});
		if (!explicit) {
			throw new Error("PIPELINE_NAO_PERTENCE_ORG");
		}
		return explicit;
	}

	const defaultPipe = await db.query.pipeline.findFirst({
		where: and(
			eq(pipeline.organizationId, organizationId),
			eq(pipeline.isDefault, true),
		),
		columns: { id: true },
	});
	if (defaultPipe) return defaultPipe;

	const fallback = await db.query.pipeline.findFirst({
		where: eq(pipeline.organizationId, organizationId),
		columns: { id: true },
	});
	if (!fallback) throw new Error("Org sem pipeline configurado");
	return fallback;
}

// Procura lead aberto (stage não-WON e não-LOST) pra um contato em um
// pipeline específico. Retorna leadId se houver, senão null.
async function findOpenLeadForContact(
	contactId: string,
	pipelineId: string,
): Promise<string | null> {
	const stages = await db.query.pipelineStage.findMany({
		where: eq(pipelineStage.pipelineId, pipelineId),
		columns: { id: true, category: true },
	});
	const closedStageIds = stages
		.filter((s) => s.category === "WON" || s.category === "LOST")
		.map((s) => s.id);

	const conditions = [
		eq(lead.contactId, contactId),
		eq(lead.pipelineId, pipelineId),
	];
	if (closedStageIds.length > 0) {
		conditions.push(notInArray(lead.stageId, closedStageIds));
	}

	const existing = await db.query.lead.findFirst({
		where: and(...conditions),
		columns: { id: true },
	});
	return existing?.id ?? null;
}

// ============================================================
// 1. criarLead — Cria novo lead (cria contato se necessário)
// ============================================================
//
// Pivot Comercial 100% Wave 1 A.2 — fix duplicação de contato.
// Antes: sempre inseria contato novo. Depois: lookup (org, phone) e
// reusa contato existente. Bloqueia criação se já há lead aberto pra
// esse contato no pipeline default.
export const criarLead = createTool({
	id: "criarLead",
	description:
		"Cria um novo lead no pipeline. Use quando o contato demonstrar interesse comercial. Reusa contato existente se já houver um com mesmo telefone na organização (não duplica). Se o contato já tem um lead aberto, retorna LEAD_DUPLICADO_PARA_CONTATO com o leadId existente.",
	inputSchema: z.object({
		nome: z.string().describe("Nome do lead"),
		telefone: z.string().optional().describe("Telefone WhatsApp"),
		email: z.string().email().optional(),
		titulo: z.string().optional().describe("Resumo curto do lead"),
		valor: z.number().optional().describe("Valor estimado em BRL"),
	}),
	outputSchema: z.object({
		leadId: z.string(),
		ok: z.boolean(),
		contactReused: z.boolean(),
	}),
	execute: async (input: any, ctx: any) => {
		const requestContext = ctx?.requestContext;
		try {
			const organizationId = requireOrgId(requestContext as ContextLike);
			const { nome, telefone, email, titulo, valor } = input;

			const pipelineRow = await resolveOrgPipeline(organizationId);

			const stageRow = await db.query.pipelineStage.findFirst({
				where: eq(pipelineStage.pipelineId, pipelineRow.id),
				orderBy: (s, { asc }) => asc(s.position),
			});
			if (!stageRow) throw new Error("Pipeline sem stages");

			let contactId: string;
			let contactReused = false;

			if (telefone) {
				const existing = await db.query.contact.findFirst({
					where: and(
						eq(contact.organizationId, organizationId),
						eq(contact.phone, telefone),
					),
					columns: { id: true, name: true },
				});

				if (existing) {
					contactId = existing.id;
					contactReused = true;
					// Atualiza nome SOMENTE se o existente está vazio. Não sobrescreve
					// nome real informado anteriormente (UX: agente não deve renomear
					// contato sem decisão consciente).
					if (!existing.name?.trim() && nome) {
						await db
							.update(contact)
							.set({ name: nome, updatedAt: new Date() })
							.where(eq(contact.id, existing.id));
					}
				} else {
					const [created] = await db
						.insert(contact)
						.values({
							organizationId,
							name: nome,
							phone: telefone,
							email,
							source: "agent",
						})
						.returning({ id: contact.id });
					contactId = created.id;
				}
			} else {
				const [created] = await db
					.insert(contact)
					.values({
						organizationId,
						name: nome,
						email,
						source: "agent",
					})
					.returning({ id: contact.id });
				contactId = created.id;
			}

			const openLeadId = await findOpenLeadForContact(
				contactId,
				pipelineRow.id,
			);
			if (openLeadId) {
				log.warn(
					{ contactId, openLeadId },
					"criarLead bloqueado: contato já tem lead aberto",
				);
				throw new Error(
					`LEAD_DUPLICADO_PARA_CONTATO: contato já tem lead aberto ${openLeadId}. Use vincularLeadAContato com pipelineId diferente OU continue trabalhando o lead existente.`,
				);
			}

			const [leadRow] = await db
				.insert(lead)
				.values({
					organizationId,
					contactId,
					pipelineId: pipelineRow.id,
					stageId: stageRow.id,
					title: titulo ?? nome,
					value: valor ? String(valor) : null,
					isSandbox: isSandboxRun(requestContext as ContextLike),
				})
				.returning({ id: lead.id });

			log.info(
				{ leadId: leadRow.id, contactId, contactReused, nome },
				"criarLead ok",
			);
			return { leadId: leadRow.id, ok: true, contactReused };
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			log.error({ err, msg }, "criarLead falhou");
			throw new Error(`Falha ao criar lead: ${msg}`);
		}
	},
});

// ============================================================
// 1b. vincularLeadAContato — Cria lead pra contato existente
// ============================================================
//
// Pivot Comercial 100% Wave 1 A.7. Útil quando agente identifica
// oportunidade pra contato JÁ cadastrado (sincronizado do WhatsApp ou
// criado anteriormente). Não cria contato novo.
export const vincularLeadAContato = createTool({
	id: "vincularLeadAContato",
	description:
		"Cria um novo lead vinculado a um contato JÁ existente na base (sincronizado do WhatsApp ou criado anteriormente). Use quando o contato já está cadastrado e você quer abrir uma nova oportunidade comercial pra ele. Requer contactId. Não cria contato novo (para isso use criarLead). Aceita pipelineId opcional (default: pipeline padrão da organização).",
	inputSchema: z.object({
		contactId: z.string(),
		titulo: z.string().optional(),
		valor: z.number().nonnegative().optional(),
		pipelineId: z
			.string()
			.optional()
			.describe("Pipeline destino (default: pipeline padrão da org)"),
	}),
	outputSchema: z.object({ leadId: z.string(), ok: z.boolean() }),
	execute: async (input: any, ctx: any) => {
		const requestContext = ctx?.requestContext;
		try {
			const organizationId = requireOrgId(requestContext as ContextLike);
			const { contactId, titulo, valor, pipelineId } = input;

			const contactRow = await db.query.contact.findFirst({
				where: eq(contact.id, contactId),
				columns: { id: true, name: true, organizationId: true },
			});
			if (!contactRow) {
				throw new Error(`contato ${contactId} não encontrado`);
			}
			if (contactRow.organizationId !== organizationId) {
				throw new Error("CONTATO_NAO_PERTENCE_ORG");
			}

			const pipelineRow = await resolveOrgPipeline(organizationId, pipelineId);

			const stageRow = await db.query.pipelineStage.findFirst({
				where: eq(pipelineStage.pipelineId, pipelineRow.id),
				orderBy: (s, { asc }) => asc(s.position),
			});
			if (!stageRow) throw new Error("Pipeline sem stages");

			const openLeadId = await findOpenLeadForContact(
				contactId,
				pipelineRow.id,
			);
			if (openLeadId) {
				log.warn(
					{ contactId, openLeadId, pipelineId: pipelineRow.id },
					"vincularLeadAContato bloqueado: lead aberto existente",
				);
				throw new Error(
					`LEAD_DUPLICADO_PARA_CONTATO: contato já tem lead aberto ${openLeadId} neste pipeline. Continue trabalhando o lead existente OU use outro pipelineId.`,
				);
			}

			const [leadRow] = await db
				.insert(lead)
				.values({
					organizationId,
					contactId,
					pipelineId: pipelineRow.id,
					stageId: stageRow.id,
					title: titulo ?? contactRow.name ?? "Novo lead",
					value: valor !== undefined ? String(valor) : null,
					isSandbox: isSandboxRun(requestContext as ContextLike),
				})
				.returning({ id: lead.id });

			log.info(
				{ leadId: leadRow.id, contactId, pipelineId: pipelineRow.id },
				"vincularLeadAContato ok",
			);
			return { leadId: leadRow.id, ok: true };
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			log.error({ err, msg }, "vincularLeadAContato falhou");
			throw new Error(`Falha ao vincular lead: ${msg}`);
		}
	},
});

// ============================================================
// 2. moverLeadStage — Move lead pra outro stage do pipeline
// ============================================================
export const moverLeadStage = createTool({
	id: "moverLeadStage",
	description:
		"Move lead pra outro estágio do funil. Use quando lead avança/recua na qualificação (ex: 'novo'→'qualificado').",
	inputSchema: z.object({
		leadId: z.string(),
		stageId: z.string().describe("ID do stage destino (ver verHistoricoLead pra opções)"),
	}),
	outputSchema: z.object({ ok: z.boolean() }),
	execute: async (input: any, ctx: any) => {
		const requestContext = ctx?.requestContext;
		requireOrgId(requestContext as ContextLike);
		const agentId = getAgentId(requestContext as ContextLike);

		await db
			.update(lead)
			.set({ stageId: input.stageId })
			.where(eq(lead.id, input.leadId));

		await db.insert(leadActivity).values({
			leadId: input.leadId,
			type: "STAGE_CHANGE",
			title: "Stage alterado pelo Atendente",
			content: `Movido pro stage ${input.stageId}`,
			agentId,
			isSandbox: isSandboxRun(requestContext as ContextLike),
		});

		return { ok: true };
	},
});

// ============================================================
// 3. atualizarLead — Patch genérico (10 campos, 1 chamada)
// ============================================================
//
// Pivot Comercial 100% — Wave 1, Bloco A.1.
// Substitui split antigo de 3 tools (atualizarLead 3 campos +
// definirTemperatura + outras tools por campo) por padrão genérico.
// LLM descreve só os campos que muda; demais ficam inalterados.
//
// `moverLeadStage` permanece SEPARADA — semântica distinta
// (mexe em FK + cria activity STAGE_CHANGE).

const PATCH_SCHEMA = z.object({
	titulo: z.string().min(1).optional(),
	descricao: z.string().optional(),
	valor: z.number().nonnegative().optional(),
	temperatura: z.enum(["COLD", "WARM", "HOT"]).optional(),
	prioridade: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
	origem: z.string().optional(),
	interesses: z.array(z.string()).optional(),
	responsavelId: z.string().nullable().optional(),
	tags: z.array(z.string()).optional(),
	favoritar: z.boolean().optional(),
	dueDate: z.string().datetime().nullable().optional(),
});

type LeadPatch = z.infer<typeof PATCH_SCHEMA>;

// Mapeia campos UX-friendly do patch pra colunas reais da tabela `lead`.
function mapPatchToColumns(patch: LeadPatch): {
	updates: Record<string, unknown>;
	updatedFields: string[];
} {
	const updates: Record<string, unknown> = {};
	const updatedFields: string[] = [];

	if (patch.titulo !== undefined) {
		updates.title = patch.titulo;
		updatedFields.push("titulo");
	}
	if (patch.descricao !== undefined) {
		updates.description = patch.descricao;
		updatedFields.push("descricao");
	}
	if (patch.valor !== undefined) {
		updates.value = String(patch.valor);
		updatedFields.push("valor");
	}
	if (patch.temperatura !== undefined) {
		updates.temperature = patch.temperatura;
		updatedFields.push("temperatura");
	}
	if (patch.prioridade !== undefined) {
		updates.priority = patch.prioridade;
		updatedFields.push("prioridade");
	}
	if (patch.origem !== undefined) {
		updates.origin = patch.origem;
		updatedFields.push("origem");
	}
	if (patch.interesses !== undefined) {
		updates.interests = patch.interesses;
		updatedFields.push("interesses");
	}
	if (patch.responsavelId !== undefined) {
		updates.assignedTo = patch.responsavelId;
		updatedFields.push("responsavelId");
	}
	if (patch.tags !== undefined) {
		updates.tags = patch.tags;
		updatedFields.push("tags");
	}
	if (patch.favoritar !== undefined) {
		updates.starred = patch.favoritar;
		updatedFields.push("favoritar");
	}
	if (patch.dueDate !== undefined) {
		updates.dueDate = patch.dueDate ? new Date(patch.dueDate) : null;
		updatedFields.push("dueDate");
	}

	return { updates, updatedFields };
}

export const atualizarLead = createTool({
	id: "atualizarLead",
	description:
		"Atualiza um ou mais campos de um lead em uma única chamada. Use SOMENTE os campos que precisa modificar dentro de `patch` (todos opcionais); campos omitidos ficam inalterados. Campos disponíveis: titulo, descricao, valor (BRL), temperatura (COLD/WARM/HOT), prioridade (LOW/NORMAL/HIGH/URGENT), origem (slug do canal), interesses (array de tags), responsavelId (user id ou null), tags (array de strings), favoritar (boolean), dueDate (ISO datetime ou null). Para mover de estágio, use moverLeadStage.",
	inputSchema: z.object({
		leadId: z.string(),
		patch: PATCH_SCHEMA,
	}),
	outputSchema: z.object({
		ok: z.boolean(),
		updatedFields: z.array(z.string()),
	}),
	execute: async (input: any, ctx: any) => {
		const requestContext = ctx?.requestContext;
		const organizationId = requireOrgId(requestContext as ContextLike);
		const { leadId, patch } = input as { leadId: string; patch: LeadPatch };

		const { updates, updatedFields } = mapPatchToColumns(patch);

		if (updatedFields.length === 0) {
			throw new Error(
				"patch sem campos: informe ao menos um campo para atualizar",
			);
		}

		const existing = await db.query.lead.findFirst({
			where: eq(lead.id, leadId),
			columns: { id: true, organizationId: true },
		});
		if (!existing) {
			throw new Error(`lead ${leadId} não encontrado`);
		}
		if (existing.organizationId !== organizationId) {
			throw new Error("LEAD_NAO_PERTENCE_ORG");
		}

		updates.updatedAt = new Date();

		await db.update(lead).set(updates).where(eq(lead.id, leadId));

		log.info({ leadId, updatedFields }, "atualizarLead ok");
		return { ok: true, updatedFields };
	},
});

// ============================================================
// 4. definirTemperatura — alias deprecated de atualizarLead
// ============================================================
//
// @deprecated Use `atualizarLead({ leadId, patch: { temperatura } })`.
// Mantido como alias durante migração — será removido em
// Comercial 100% Wave 4.
export const definirTemperatura = createTool({
	id: "definirTemperatura",
	description:
		"DEPRECATED. Use atualizarLead com patch { temperatura }. Mantido por compatibilidade — define apenas a temperatura do lead (COLD/WARM/HOT).",
	inputSchema: z.object({
		leadId: z.string(),
		temperatura: z.enum(["COLD", "WARM", "HOT"]),
	}),
	outputSchema: z.object({ ok: z.boolean() }),
	execute: async (input: any, ctx: any) => {
		const requestContext = ctx?.requestContext;
		const organizationId = requireOrgId(requestContext as ContextLike);

		const existing = await db.query.lead.findFirst({
			where: eq(lead.id, input.leadId),
			columns: { id: true, organizationId: true },
		});
		if (!existing) throw new Error(`lead ${input.leadId} não encontrado`);
		if (existing.organizationId !== organizationId) {
			throw new Error("LEAD_NAO_PERTENCE_ORG");
		}

		await db
			.update(lead)
			.set({ temperature: input.temperatura, updatedAt: new Date() })
			.where(eq(lead.id, input.leadId));
		return { ok: true };
	},
});

// ============================================================
// 5. verHistoricoLead — Últimas mensagens + atividades
// ============================================================
export const verHistoricoLead = createTool({
	id: "verHistoricoLead",
	description:
		"Busca histórico do lead: últimas mensagens da conversa + atividades registradas. Use antes de decisões críticas.",
	inputSchema: z.object({
		leadId: z.string(),
		limite: z.number().optional().describe("Quantas mensagens (default 20)"),
	}),
	outputSchema: z.object({
		atividades: z.array(z.object({ type: z.string(), title: z.string(), createdAt: z.string() })),
		mensagensCount: z.number(),
	}),
	execute: async (input: any, ctx: any) => {
		const requestContext = ctx?.requestContext;
		requireOrgId(requestContext as ContextLike);
		const limite = input.limite ?? 20;

		const atividades = await db.query.leadActivity.findMany({
			where: eq(leadActivity.leadId, input.leadId),
			orderBy: desc(leadActivity.createdAt),
			limit: limite,
		});

		const leadRow = await db.query.lead.findFirst({
			where: eq(lead.id, input.leadId),
			with: { contact: true },
		});

		let mensagensCount = 0;
		if (leadRow?.contact?.id) {
			// Mensagens vivem em conversation (que tem contactId), join via subquery
			const convs = await db
				.select({ id: conversation.id })
				.from(conversation)
				.where(eq(conversation.contactId, leadRow.contact.id));
			if (convs.length > 0) {
				const msgs = await db
					.select({ id: message.id })
					.from(message)
					.where(inArray(message.conversationId, convs.map((c) => c.id)))
					.limit(limite);
				mensagensCount = msgs.length;
			}
		}

		return {
			atividades: atividades.map((a) => ({
				type: a.type,
				title: a.title,
				createdAt: a.createdAt.toISOString(),
			})),
			mensagensCount,
		};
	},
});

// ============================================================
// 6. buscarConhecimento — RAG-1 (STUB — wire na M2-02)
// ============================================================
export const buscarConhecimento = createTool({
	id: "buscarConhecimento",
	description:
		"Busca trechos relevantes na base de conhecimento (RAG-1). Use pra responder perguntas sobre produto, política, FAQ.",
	inputSchema: z.object({
		query: z.string().describe("Pergunta ou termo a buscar"),
		topK: z.number().optional().default(5),
	}),
	outputSchema: z.object({
		trechos: z.array(z.object({ texto: z.string(), score: z.number() })),
		stub: z.boolean(),
	}),
	execute: async (input: any, ctx: any) => {
		const requestContext = ctx?.requestContext;
		requireOrgId(requestContext as ContextLike);
		// TODO M2-02: wire `searchKnowledgeBase` (Phase 08-alpha pgvector)
		log.warn({ query: input.query }, "buscarConhecimento STUB — wire pendente RAG-1");
		return { trechos: [], stub: true };
	},
});

// ============================================================
// 7. verDisponibilidade — Slots livres na agenda
// ============================================================
export const verDisponibilidade = createTool({
	id: "verDisponibilidade",
	description:
		"Verifica horários livres na agenda nos próximos N dias. Use antes de propor agendamento.",
	inputSchema: z.object({
		dias: z.number().optional().default(7).describe("Olhar próximos N dias"),
		duracaoMinutos: z.number().optional().default(60),
	}),
	outputSchema: z.object({
		eventosOcupados: z.array(
			z.object({ inicio: z.string(), titulo: z.string() }),
		),
	}),
	execute: async (input: any, ctx: any) => {
		const requestContext = ctx?.requestContext;
		const organizationId = requireOrgId(requestContext as ContextLike);
		const calRow = await db.query.calendar.findFirst({
			where: eq(calendar.organizationId, organizationId),
		});
		if (!calRow) return { eventosOcupados: [] };

		const inicio = new Date();
		const fim = new Date(Date.now() + input.dias * 24 * 60 * 60 * 1000);

		const eventos = await db.query.calendarEvent.findMany({
			where: and(
				eq(calendarEvent.calendarId, calRow.id),
				// startAt >= inicio AND startAt <= fim
			),
			orderBy: (e, { asc }) => asc(e.startAt),
		});

		return {
			eventosOcupados: eventos
				.filter((e) => e.startAt >= inicio && e.startAt <= fim)
				.map((e) => ({ inicio: e.startAt.toISOString(), titulo: e.title })),
		};
	},
});

// ============================================================
// 8. agendarEvento — Cria evento na agenda
// ============================================================
export const agendarEvento = createTool({
	id: "agendarEvento",
	description:
		"Cria evento (consulta/reunião) na agenda. Confirme disponibilidade com verDisponibilidade antes.",
	inputSchema: z.object({
		titulo: z.string(),
		inicioISO: z.string().describe("ISO 8601, ex: 2026-05-10T14:00:00-03:00"),
		duracao: z.string().optional().default("1 hora"),
		descricao: z.string().optional(),
		leadId: z.string().optional().describe("Vincular evento a lead"),
	}),
	outputSchema: z.object({ eventoId: z.string(), ok: z.boolean() }),
	execute: async (input: any, ctx: any) => {
		const requestContext = ctx?.requestContext;
		const organizationId = requireOrgId(requestContext as ContextLike);
		const calRow = await db.query.calendar.findFirst({
			where: eq(calendar.organizationId, organizationId),
		});
		if (!calRow) throw new Error("Org sem calendar configurado");

		const sandbox = isSandboxRun(requestContext as ContextLike);
		const [evento] = await db
			.insert(calendarEvent)
			.values({
				organizationId,
				calendarId: calRow.id,
				title: input.titulo,
				description: input.descricao,
				startAt: new Date(input.inicioISO),
				duration: input.duracao,
				isSandbox: sandbox,
			})
			.returning();

		if (input.leadId) {
			await db.insert(leadActivity).values({
				leadId: input.leadId,
				type: "MEETING",
				title: `Agendado: ${input.titulo}`,
				content: `Início: ${input.inicioISO}, duração: ${input.duracao}`,
				metadata: { eventoId: evento.id },
				agentId: getAgentId(requestContext as ContextLike),
				isSandbox: sandbox,
			});
		}

		return { eventoId: evento.id, ok: true };
	},
});

// ============================================================
// 9. criarTarefa — Registra tarefa pra equipe
// ============================================================
export const criarTarefa = createTool({
	id: "criarTarefa",
	description:
		"Cria tarefa pra equipe humana (ex: 'enviar contrato', 'ligar de volta'). Vincula a lead se possível.",
	inputSchema: z.object({
		leadId: z.string(),
		titulo: z.string(),
		descricao: z.string().optional(),
	}),
	outputSchema: z.object({ tarefaId: z.string(), ok: z.boolean() }),
	execute: async (input: any, ctx: any) => {
		const requestContext = ctx?.requestContext;
		requireOrgId(requestContext as ContextLike);
		const [activity] = await db
			.insert(leadActivity)
			.values({
				leadId: input.leadId,
				type: "TASK",
				title: input.titulo,
				content: input.descricao,
				agentId: getAgentId(requestContext as ContextLike),
				isSandbox: isSandboxRun(requestContext as ContextLike),
			})
			.returning();
		return { tarefaId: activity.id, ok: true };
	},
});

// ============================================================
// 10. pedirHumano — Handoff (STUB — wire em M2-05 Assistente)
// ============================================================
export const pedirHumano = createTool({
	id: "pedirHumano",
	description:
		"Solicita handoff pra atendente humano. Use quando: cliente bravo, decisão acima da alçada, situação delicada (médica/legal), pedido explícito.",
	inputSchema: z.object({
		leadId: z.string(),
		motivo: z.string().describe("Por que precisa humano agora"),
		urgencia: z.enum(["baixa", "média", "alta"]).default("média"),
	}),
	outputSchema: z.object({ ok: z.boolean(), notificacaoEnviada: z.boolean() }),
	execute: async (input: any, ctx: any) => {
		const requestContext = ctx?.requestContext;
		requireOrgId(requestContext as ContextLike);
		// Registra atividade — notificação real fica pro Assistente (M2-05)
		await db.insert(leadActivity).values({
			leadId: input.leadId,
			type: "SYSTEM",
			title: `🚨 Handoff humano solicitado (${input.urgencia})`,
			content: input.motivo,
			metadata: { handoff: true, urgencia: input.urgencia },
			agentId: getAgentId(requestContext as ContextLike),
			isSandbox: isSandboxRun(requestContext as ContextLike),
		});
		log.warn({ leadId: input.leadId, urgencia: input.urgencia }, "pedirHumano STUB — Assistente (M2-05) fará notificação");
		return { ok: true, notificacaoEnviada: false };
	},
});

// ============================================================
// 11. enviarPropostaPdf — Gera + envia (STUB — service futuro)
// ============================================================
export const enviarPropostaPdf = createTool({
	id: "enviarPropostaPdf",
	description:
		"Gera proposta em PDF e envia pro lead via WhatsApp. Use ao fechar venda. Requer dados do plano.",
	inputSchema: z.object({
		leadId: z.string(),
		plano: z.string().describe("Nome do plano (ex: 'Starter', 'Growth')"),
		valor: z.number().describe("Valor mensal em BRL"),
		observacoes: z.string().optional(),
	}),
	outputSchema: z.object({ ok: z.boolean(), pdfUrl: z.string().nullable() }),
	execute: async (input: any, ctx: any) => {
		const requestContext = ctx?.requestContext;
		requireOrgId(requestContext as ContextLike);
		await db.insert(leadActivity).values({
			leadId: input.leadId,
			type: "NOTE",
			title: `Proposta solicitada: ${input.plano} R$${input.valor}/mês`,
			content: input.observacoes,
			metadata: {
				stub: true,
				plano: input.plano,
				valor: input.valor,
			},
			agentId: getAgentId(requestContext as ContextLike),
			isSandbox: isSandboxRun(requestContext as ContextLike),
		});
		log.warn({ leadId: input.leadId, plano: input.plano, valor: input.valor }, "enviarPropostaPdf STUB — PDF gen + envio WA pendente");
		return { ok: true, pdfUrl: null };
	},
});

// ============================================================
// Registry — exportado como atendenteTools
// ============================================================
export const atendenteTools = {
	criarLead,
	vincularLeadAContato,
	moverLeadStage,
	atualizarLead,
	definirTemperatura,
	verHistoricoLead,
	buscarConhecimento,
	verDisponibilidade,
	agendarEvento,
	criarTarefa,
	pedirHumano,
	enviarPropostaPdf,
} as const;

export type AtendenteToolKey = keyof typeof atendenteTools;
