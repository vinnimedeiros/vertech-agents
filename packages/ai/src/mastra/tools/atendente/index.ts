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
	pipeline,
	pipelineStage,
} from "@repo/database";
import { z } from "zod";

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
// 1. criarLead — Cria novo lead no pipeline padrão da org
// ============================================================
export const criarLead = createTool({
	id: "criarLead",
	description:
		"Cria um novo lead no pipeline. Use quando o contato demonstrar interesse comercial. Requer nome do lead.",
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
	}),
	execute: async (input: any, ctx: any) => {
		const requestContext = ctx?.requestContext;
		try {
			const organizationId = requireOrgId(requestContext as ContextLike);
			const { nome, telefone, email, titulo, valor } = input;

			const pipelineRow = await db.query.pipeline.findFirst({
				where: eq(pipeline.organizationId, organizationId),
			});
			if (!pipelineRow) throw new Error("Org sem pipeline configurado");

			const stageRow = await db.query.pipelineStage.findFirst({
				where: eq(pipelineStage.pipelineId, pipelineRow.id),
				orderBy: (s, { asc }) => asc(s.position),
			});
			if (!stageRow) throw new Error("Pipeline sem stages");

			const [contactRow] = await db
				.insert(contact)
				.values({
					organizationId,
					name: nome,
					phone: telefone,
					email,
					source: "agent",
				})
				.returning();

			const [leadRow] = await db
				.insert(lead)
				.values({
					organizationId,
					contactId: contactRow.id,
					pipelineId: pipelineRow.id,
					stageId: stageRow.id,
					title: titulo ?? nome,
					value: valor ? String(valor) : null,
					isSandbox: isSandboxRun(requestContext as ContextLike),
				})
				.returning();

			console.log(`[criarLead OK] leadId=${leadRow.id} nome=${nome}`);
			return { leadId: leadRow.id, ok: true };
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			console.error(`[criarLead ERRO] ${msg}`, err);
			throw new Error(`Falha ao criar lead: ${msg}`);
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
// 3. atualizarLead — Atualiza dados básicos
// ============================================================
export const atualizarLead = createTool({
	id: "atualizarLead",
	description:
		"Atualiza dados do lead (título, descrição, valor estimado). NÃO usar pra mover stage — usar moverLeadStage.",
	inputSchema: z.object({
		leadId: z.string(),
		titulo: z.string().optional(),
		descricao: z.string().optional(),
		valor: z.number().optional(),
	}),
	outputSchema: z.object({ ok: z.boolean() }),
	execute: async (input: any, ctx: any) => {
		const requestContext = ctx?.requestContext;
		requireOrgId(requestContext as ContextLike);
		const updates: Record<string, unknown> = {};
		if (input.titulo !== undefined) updates.title = input.titulo;
		if (input.descricao !== undefined) updates.description = input.descricao;
		if (input.valor !== undefined) updates.value = String(input.valor);

		if (Object.keys(updates).length === 0) return { ok: true };
		await db.update(lead).set(updates).where(eq(lead.id, input.leadId));
		return { ok: true };
	},
});

// ============================================================
// 4. definirTemperatura — COLD/WARM/HOT
// ============================================================
export const definirTemperatura = createTool({
	id: "definirTemperatura",
	description:
		"Define temperatura do lead baseado no engajamento. COLD=frio (sem interesse claro), WARM=morno (interesse mas sem urgência), HOT=quente (pronto pra fechar).",
	inputSchema: z.object({
		leadId: z.string(),
		temperatura: z.enum(["COLD", "WARM", "HOT"]),
	}),
	outputSchema: z.object({ ok: z.boolean() }),
	execute: async (input: any, ctx: any) => {
		const requestContext = ctx?.requestContext;
		requireOrgId(requestContext as ContextLike);
		await db
			.update(lead)
			.set({ temperature: input.temperatura })
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
		console.warn(
			"[buscarConhecimento STUB] M2-01 — wire pendente RAG-1 pgvector. Query:",
			input.query,
		);
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
		console.warn(
			"[pedirHumano STUB] M2-01 — Assistente (M2-05) fará notificação real no grupo WhatsApp.",
		);
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
		console.warn(
			"[enviarPropostaPdf STUB] M2-01 — service de PDF gen + envio WA pendente.",
		);
		return { ok: true, pdfUrl: null };
	},
});

// ============================================================
// Registry — exportado como atendenteTools
// ============================================================
export const atendenteTools = {
	criarLead,
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
