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
	ilike,
	inArray,
	lead,
	leadActivity,
	message,
	notInArray,
	or,
	pipeline,
	pipelineStage,
	whatsappInstance,
} from "@repo/database";
import {
	sendDocument as sendWhatsAppDocument,
	sendImage as sendWhatsAppImage,
	sendVideo as sendWhatsAppVideo,
	sendVoiceNote as sendWhatsAppVoiceNote,
} from "@repo/whatsapp";
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
	execute: async (input, ctx) => {
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
	execute: async (input, ctx) => {
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
	execute: async (input, ctx) => {
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
	execute: async (input, ctx) => {
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
	execute: async (input, ctx) => {
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
	execute: async (input, ctx) => {
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
	execute: async (input, ctx) => {
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
	execute: async (input, ctx) => {
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
	execute: async (input, ctx) => {
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
	execute: async (input, ctx) => {
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
	execute: async (input, ctx) => {
		const requestContext = ctx?.requestContext;
		requireOrgId(requestContext as ContextLike);
		// Registra atividade — notificação real fica pro Assistente (M2-05)
		await db.insert(leadActivity).values({
			leadId: input.leadId,
			type: "SYSTEM",
			title: `[URGENTE] Handoff humano solicitado (${input.urgencia})`,
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
	execute: async (input, ctx) => {
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
// Wave 1 A.3-A.6 — Tools P0 do Atendente (mídia, resolver, busca, NOTE)
// ============================================================

// Helper: resolve conversa WhatsApp ativa do contato (uniqueIndex
// conversation_contact_channel_uniq garante 1 por par contato+canal).
async function findWhatsAppConversation(
	organizationId: string,
	contactId: string,
): Promise<{
	id: string;
	channelInstanceId: string | null;
	phone: string | null;
} | null> {
	const [row] = await db
		.select({
			id: conversation.id,
			channelInstanceId: conversation.channelInstanceId,
			phone: contact.phone,
		})
		.from(conversation)
		.innerJoin(contact, eq(conversation.contactId, contact.id))
		.where(
			and(
				eq(conversation.organizationId, organizationId),
				eq(conversation.contactId, contactId),
				eq(conversation.channel, "WHATSAPP"),
			),
		)
		.limit(1);
	return row ?? null;
}

// Helper: resolve instance WhatsApp ativa pra conversa (fallback pra
// primeira CONNECTED/CONNECTING da org se a vinculada estiver morta).
async function resolveActiveWhatsAppInstance(
	organizationId: string,
	currentInstanceId: string | null,
): Promise<string | null> {
	if (currentInstanceId) {
		const [row] = await db
			.select({ status: whatsappInstance.status })
			.from(whatsappInstance)
			.where(eq(whatsappInstance.id, currentInstanceId))
			.limit(1);
		if (
			row &&
			(row.status === "CONNECTED" ||
				row.status === "CONNECTING" ||
				row.status === "DISCONNECTED")
		) {
			return currentInstanceId;
		}
	}
	const [active] = await db
		.select({ id: whatsappInstance.id })
		.from(whatsappInstance)
		.where(
			and(
				eq(whatsappInstance.organizationId, organizationId),
				inArray(whatsappInstance.status, [
					"CONNECTED",
					"CONNECTING",
					"DISCONNECTED",
				]),
			),
		)
		.limit(1);
	return active?.id ?? null;
}

// ============================================================
// 12. enviarMidia — IMAGE/AUDIO/VIDEO/DOCUMENT pelo WhatsApp
// ============================================================
export const enviarMidia = createTool({
	id: "enviarMidia",
	description:
		"Envia mídia (imagem, áudio, vídeo ou documento) pro lead via WhatsApp. A mídia já deve estar hospedada e ter URL pública acessível. Use quando o lead pedir foto de produto, comprovante, ficha técnica em PDF, áudio explicativo etc. Atendente NÃO gera a mídia, só envia URL existente. Para enviar proposta PDF gerada, use enviarPropostaPdf.",
	inputSchema: z.object({
		leadId: z.string(),
		tipo: z.enum(["IMAGE", "AUDIO", "VIDEO", "DOCUMENT"]),
		mediaUrl: z.string().url(),
		caption: z
			.string()
			.optional()
			.describe("Texto que acompanha a mídia (não aplica em AUDIO)"),
		mediaFileName: z
			.string()
			.optional()
			.describe("Nome do arquivo (obrigatório em DOCUMENT)"),
		mediaMimeType: z
			.string()
			.optional()
			.describe("MIME type (obrigatório em DOCUMENT)"),
	}),
	outputSchema: z.object({
		ok: z.boolean(),
		messageId: z.string().nullable(),
	}),
	execute: async (input, ctx) => {
		const requestContext = ctx?.requestContext;
		const organizationId = requireOrgId(requestContext as ContextLike);
		const sandbox = isSandboxRun(requestContext as ContextLike);

		const leadRow = await db.query.lead.findFirst({
			where: eq(lead.id, input.leadId),
			columns: { id: true, organizationId: true, contactId: true },
		});
		if (!leadRow) throw new Error(`lead ${input.leadId} não encontrado`);
		if (leadRow.organizationId !== organizationId) {
			throw new Error("LEAD_NAO_PERTENCE_ORG");
		}

		const conv = await findWhatsAppConversation(
			organizationId,
			leadRow.contactId,
		);
		if (!conv) {
			throw new Error("CONTATO_SEM_CONVERSA_WHATSAPP");
		}
		if (!conv.phone) {
			throw new Error("CONTATO_SEM_TELEFONE");
		}

		if (input.tipo === "DOCUMENT") {
			if (!input.mediaFileName || !input.mediaMimeType) {
				throw new Error(
					"DOCUMENT exige mediaFileName e mediaMimeType preenchidos",
				);
			}
		}

		const now = new Date();
		const [msg] = await db
			.insert(message)
			.values({
				conversationId: conv.id,
				senderType: "AGENT",
				senderId: getAgentId(requestContext as ContextLike) ?? null,
				direction: "OUTBOUND",
				type: input.tipo,
				status: "PENDING",
				mediaUrl: input.mediaUrl,
				mediaMimeType: input.mediaMimeType ?? null,
				mediaFileName: input.mediaFileName ?? null,
				caption: input.caption ?? null,
				createdAt: now,
			})
			.returning({ id: message.id });

		const instanceId = await resolveActiveWhatsAppInstance(
			organizationId,
			conv.channelInstanceId,
		);
		if (!instanceId) {
			await db
				.update(message)
				.set({ status: "FAILED" })
				.where(eq(message.id, msg.id));
			throw new Error("SEM_INSTANCIA_WHATSAPP_ATIVA");
		}

		// Sandbox: registra message, não dispara real (evita queimar número).
		if (sandbox) {
			await db
				.update(message)
				.set({ status: "SENT" })
				.where(eq(message.id, msg.id));
			log.info(
				{ leadId: input.leadId, tipo: input.tipo, messageId: msg.id, sandbox: true },
				"enviarMidia ok (sandbox skip whatsapp)",
			);
			return { ok: true, messageId: msg.id };
		}

		try {
			let result: any;
			switch (input.tipo) {
				case "IMAGE":
					result = await sendWhatsAppImage(
						instanceId,
						conv.phone,
						input.mediaUrl,
						input.caption ?? undefined,
					);
					break;
				case "VIDEO":
					result = await sendWhatsAppVideo(
						instanceId,
						conv.phone,
						input.mediaUrl,
						input.caption ?? undefined,
					);
					break;
				case "AUDIO":
					result = await sendWhatsAppVoiceNote(
						instanceId,
						conv.phone,
						input.mediaUrl,
					);
					break;
				case "DOCUMENT":
					result = await sendWhatsAppDocument(
						instanceId,
						conv.phone,
						input.mediaUrl,
						input.mediaFileName ?? "arquivo",
						input.mediaMimeType ?? "application/octet-stream",
					);
					break;
			}

			await db
				.update(message)
				.set({ status: "SENT", externalId: result?.key?.id ?? null })
				.where(eq(message.id, msg.id));

			log.info(
				{ leadId: input.leadId, tipo: input.tipo, messageId: msg.id },
				"enviarMidia ok",
			);
			return { ok: true, messageId: msg.id };
		} catch (err) {
			await db
				.update(message)
				.set({ status: "FAILED" })
				.where(eq(message.id, msg.id));
			const msgErr = err instanceof Error ? err.message : String(err);
			log.error(
				{ err, msgErr, leadId: input.leadId, tipo: input.tipo },
				"enviarMidia falhou no envio WhatsApp",
			);
			return { ok: false, messageId: msg.id };
		}
	},
});

// ============================================================
// 13. marcarConversaResolvida — encerra conversa WhatsApp do lead
// ============================================================
export const marcarConversaResolvida = createTool({
	id: "marcarConversaResolvida",
	description:
		"Marca a conversa do lead como RESOLVIDA. Use quando o atendimento foi concluído (lead virou cliente, decidiu não comprar, ou pediu para encerrar). Move a conversa para fora da caixa ativa. Aceita motivo opcional.",
	inputSchema: z.object({
		leadId: z.string(),
		motivo: z
			.string()
			.optional()
			.describe("Motivo do encerramento (registrado em activity NOTE)"),
	}),
	outputSchema: z.object({ ok: z.boolean() }),
	execute: async (input, ctx) => {
		const requestContext = ctx?.requestContext;
		const organizationId = requireOrgId(requestContext as ContextLike);
		const agentId = getAgentId(requestContext as ContextLike);

		const leadRow = await db.query.lead.findFirst({
			where: eq(lead.id, input.leadId),
			columns: { id: true, organizationId: true, contactId: true },
		});
		if (!leadRow) throw new Error(`lead ${input.leadId} não encontrado`);
		if (leadRow.organizationId !== organizationId) {
			throw new Error("LEAD_NAO_PERTENCE_ORG");
		}

		const conv = await findWhatsAppConversation(
			organizationId,
			leadRow.contactId,
		);
		if (!conv) throw new Error("CONTATO_SEM_CONVERSA");

		const now = new Date();
		await db
			.update(conversation)
			.set({ status: "RESOLVED", updatedAt: now })
			.where(eq(conversation.id, conv.id));

		if (input.motivo) {
			await db.insert(leadActivity).values({
				leadId: input.leadId,
				type: "NOTE",
				title: "Conversa resolvida",
				content: input.motivo,
				agentId,
				isSandbox: isSandboxRun(requestContext as ContextLike),
			});
		}

		log.info(
			{ leadId: input.leadId, conversationId: conv.id, motivo: input.motivo },
			"marcarConversaResolvida ok",
		);
		return { ok: true };
	},
});

// ============================================================
// 14. buscarLeadOuContato — search cross-conversation
// ============================================================
export const buscarLeadOuContato = createTool({
	id: "buscarLeadOuContato",
	description:
		"Busca leads e contatos da organização por nome, telefone ou email. Útil quando o agente precisa identificar se uma pessoa já está cadastrada antes de criar lead novo, ou para encontrar lead específico mencionado pelo lead atual ('cliente Maria me indicou'). Retorna até 10 resultados ordenados por atualização recente.",
	inputSchema: z.object({
		query: z
			.string()
			.min(2)
			.describe("Texto de busca (nome, telefone parcial ou email)"),
		filtroTipo: z.enum(["LEADS", "CONTATOS", "AMBOS"]).default("AMBOS"),
		limite: z.number().int().min(1).max(20).default(10),
	}),
	outputSchema: z.object({
		resultados: z.array(
			z.object({
				tipo: z.enum(["LEAD", "CONTATO"]),
				id: z.string(),
				nome: z.string(),
				telefone: z.string().nullable(),
				email: z.string().nullable(),
				leadId: z.string().nullable(),
				stage: z.string().nullable(),
				temperatura: z.string().nullable(),
			}),
		),
		total: z.number(),
	}),
	execute: async (input, ctx) => {
		const requestContext = ctx?.requestContext;
		const organizationId = requireOrgId(requestContext as ContextLike);
		const pattern = `%${input.query}%`;
		const limite = input.limite ?? 10;
		const filtro = input.filtroTipo ?? "AMBOS";

		type Row = {
			tipo: "LEAD" | "CONTATO";
			id: string;
			nome: string;
			telefone: string | null;
			email: string | null;
			leadId: string | null;
			stage: string | null;
			temperatura: string | null;
		};

		const resultados: Row[] = [];

		if (filtro === "LEADS" || filtro === "AMBOS") {
			const leadHits = await db
				.select({
					id: lead.id,
					title: lead.title,
					temperature: lead.temperature,
					updatedAt: lead.updatedAt,
					contactName: contact.name,
					contactPhone: contact.phone,
					contactEmail: contact.email,
					stageName: pipelineStage.name,
				})
				.from(lead)
				.innerJoin(contact, eq(lead.contactId, contact.id))
				.innerJoin(pipelineStage, eq(lead.stageId, pipelineStage.id))
				.where(
					and(
						eq(lead.organizationId, organizationId),
						eq(lead.isSandbox, false),
						or(
							ilike(contact.name, pattern),
							ilike(contact.phone, pattern),
							ilike(contact.email, pattern),
							ilike(lead.title, pattern),
						),
					),
				)
				.orderBy(desc(lead.updatedAt))
				.limit(limite);

			for (const r of leadHits) {
				resultados.push({
					tipo: "LEAD",
					id: r.id,
					nome: r.title ?? r.contactName,
					telefone: r.contactPhone,
					email: r.contactEmail,
					leadId: r.id,
					stage: r.stageName,
					temperatura: r.temperature,
				});
			}
		}

		if (filtro === "CONTATOS" || filtro === "AMBOS") {
			const remaining = limite - resultados.length;
			if (remaining > 0) {
				const contactHits = await db
					.select({
						id: contact.id,
						name: contact.name,
						phone: contact.phone,
						email: contact.email,
						updatedAt: contact.updatedAt,
					})
					.from(contact)
					.where(
						and(
							eq(contact.organizationId, organizationId),
							or(
								ilike(contact.name, pattern),
								ilike(contact.phone, pattern),
								ilike(contact.email, pattern),
							),
						),
					)
					.orderBy(desc(contact.updatedAt))
					.limit(remaining);

				for (const r of contactHits) {
					// Evita duplicar contatos já presentes via leads
					// Wave 1 fix QA-5 — dedup só quando phone E email têm valor
				// real. Sem este guard, dois contatos com phone/email null
				// seriam considerados a mesma pessoa silenciosamente.
				const alreadyAsLead =
					r.phone != null &&
					r.email != null &&
					resultados.some(
						(x) =>
							x.tipo === "LEAD" &&
							x.telefone === r.phone &&
							x.email === r.email,
					);
					if (alreadyAsLead) continue;
					resultados.push({
						tipo: "CONTATO",
						id: r.id,
						nome: r.name,
						telefone: r.phone,
						email: r.email,
						leadId: null,
						stage: null,
						temperatura: null,
					});
				}
			}
		}

		log.info(
			{ query: input.query, filtro, total: resultados.length },
			"buscarLeadOuContato ok",
		);
		return { resultados, total: resultados.length };
	},
});

// ============================================================
// 15. comentarLead — NOTE livre no histórico
// ============================================================
export const comentarLead = createTool({
	id: "comentarLead",
	description:
		"Adiciona um comentário (NOTE livre) no histórico do lead. Use para registrar raciocínio, observações que não cabem em campo estruturado, ou contexto para próxima interação ('lead pediu para ligar amanhã 14h'). NÃO use para tarefas (use criarTarefa). NÃO use para mover stage (use moverLeadStage).",
	inputSchema: z.object({
		leadId: z.string(),
		comentario: z.string().min(1).max(2000),
	}),
	outputSchema: z.object({ ok: z.boolean(), activityId: z.string() }),
	execute: async (input, ctx) => {
		const requestContext = ctx?.requestContext;
		const organizationId = requireOrgId(requestContext as ContextLike);
		const agentId = getAgentId(requestContext as ContextLike);

		const leadRow = await db.query.lead.findFirst({
			where: eq(lead.id, input.leadId),
			columns: { id: true, organizationId: true },
		});
		if (!leadRow) throw new Error(`lead ${input.leadId} não encontrado`);
		if (leadRow.organizationId !== organizationId) {
			throw new Error("LEAD_NAO_PERTENCE_ORG");
		}

		const [activity] = await db
			.insert(leadActivity)
			.values({
				leadId: input.leadId,
				type: "NOTE",
				title: "Comentário do agente",
				content: input.comentario,
				agentId,
				isSandbox: isSandboxRun(requestContext as ContextLike),
			})
			.returning({ id: leadActivity.id });

		log.info(
			{ leadId: input.leadId, activityId: activity.id },
			"comentarLead ok",
		);
		return { ok: true, activityId: activity.id };
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
	comentarLead,
	buscarLeadOuContato,
	marcarConversaResolvida,
	enviarMidia,
	verHistoricoLead,
	buscarConhecimento,
	verDisponibilidade,
	agendarEvento,
	criarTarefa,
	pedirHumano,
	enviarPropostaPdf,
} as const;

export type AtendenteToolKey = keyof typeof atendenteTools;
