"use client";

import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/components/tabs";
import { Calendar, MessageSquare, RotateCcw, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Lead = {
	id: string;
	title: string;
	contactName: string;
	stageName: string;
	temperature: string;
	createdAt: string;
};

type Event = {
	id: string;
	title: string;
	startAt: string;
	duration: string;
};

type Msg = { role: "user" | "assistant"; content: string };

export function SandboxClient({
	agentId,
	agentName,
	leads,
	events,
}: {
	agentId: string;
	agentName: string;
	leads: Lead[];
	events: Event[];
}) {
	const router = useRouter();
	const [messages, setMessages] = useState<Msg[]>([]);
	const [input, setInput] = useState("");
	const [streaming, setStreaming] = useState(false);
	const [mode, setMode] = useState<"sdr" | "closer" | "pos-venda">("sdr");
	const [resetting, setResetting] = useState(false);

	async function send() {
		const text = input.trim();
		if (!text || streaming) return;

		const next: Msg[] = [...messages, { role: "user", content: text }];
		setMessages(next);
		setInput("");
		setStreaming(true);

		try {
			const res = await fetch(`/api/agents/${agentId}/sandbox/chat`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ messages: next, mode }),
			});

			if (!res.body) throw new Error("Sem stream de resposta");
			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let acc = "";
			setMessages((m) => [...m, { role: "assistant", content: "" }]);

			while (true) {
				const { value, done } = await reader.read();
				if (done) break;
				acc += decoder.decode(value, { stream: true });
				setMessages((m) => {
					const copy = [...m];
					copy[copy.length - 1] = { role: "assistant", content: acc };
					return copy;
				});
			}
			router.refresh();
		} catch (err) {
			setMessages((m) => [
				...m,
				{ role: "assistant", content: `[erro: ${(err as Error).message}]` },
			]);
		} finally {
			setStreaming(false);
		}
	}

	async function reset() {
		if (!confirm("Apagar TODOS dados sandbox deste agente? (leads + atividades + eventos)"))
			return;
		setResetting(true);
		try {
			const res = await fetch(`/api/agents/${agentId}/sandbox/reset`, {
				method: "DELETE",
			});
			const json = await res.json();
			alert(
				`Reset: ${json.deleted?.leads ?? 0} leads, ${json.deleted?.activities ?? 0} atividades, ${json.deleted?.events ?? 0} eventos`,
			);
			setMessages([]);
			router.refresh();
		} finally {
			setResetting(false);
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Sandbox — {agentName}</h1>
					<p className="text-sm text-muted-foreground">
						Teste o agente sem afetar dados de produção. Tudo aqui tem flag isSandbox=true.
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={reset}
					disabled={resetting}
					className="gap-2"
				>
					<RotateCcw className="size-4" />
					{resetting ? "Resetando..." : "Resetar Sandbox"}
				</Button>
			</div>

			<Tabs defaultValue="conversa" className="w-full">
				<TabsList>
					<TabsTrigger value="conversa" className="gap-2">
						<MessageSquare className="size-4" /> Conversa
					</TabsTrigger>
					<TabsTrigger value="pipeline" className="gap-2">
						<Users className="size-4" /> Pipeline ({leads.length})
					</TabsTrigger>
					<TabsTrigger value="agenda" className="gap-2">
						<Calendar className="size-4" /> Agenda ({events.length})
					</TabsTrigger>
				</TabsList>

				<TabsContent value="conversa" className="mt-4">
					<Card className="flex h-[60vh] flex-col">
						<div className="flex items-center gap-2 border-b p-3 text-sm">
							<span className="text-muted-foreground">Modo:</span>
							{(["sdr", "closer", "pos-venda"] as const).map((m) => (
								<button
									key={m}
									type="button"
									onClick={() => setMode(m)}
									className={`rounded px-2 py-1 text-xs ${
										mode === m
											? "bg-primary text-primary-foreground"
											: "bg-muted text-muted-foreground"
									}`}
								>
									{m === "pos-venda" ? "Pós-venda" : m.toUpperCase()}
								</button>
							))}
						</div>
						<div className="flex-1 space-y-3 overflow-y-auto p-4">
							{messages.length === 0 && (
								<p className="text-center text-sm text-muted-foreground">
									Escreva como se fosse o lead. Ex: "Oi, vi anúncio de vocês, o que é isso?"
								</p>
							)}
							{messages.map((m, i) => (
								<div
									key={i}
									className={`max-w-[80%] rounded-lg p-3 text-sm ${
										m.role === "user"
											? "ml-auto bg-primary text-primary-foreground"
											: "bg-muted"
									}`}
								>
									{m.content || (streaming && i === messages.length - 1 ? "..." : "")}
								</div>
							))}
						</div>
						<div className="flex gap-2 border-t p-3">
							<input
								className="flex-1 rounded border bg-background px-3 py-2 text-sm"
								placeholder="Digite como se fosse o lead..."
								value={input}
								onChange={(e) => setInput(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
								disabled={streaming}
							/>
							<Button onClick={send} disabled={streaming || !input.trim()}>
								Enviar
							</Button>
						</div>
					</Card>
				</TabsContent>

				<TabsContent value="pipeline" className="mt-4">
					<Card className="p-4">
						{leads.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								Nenhum lead sandbox ainda. Converse na aba Conversa pra Atendente criar leads aqui.
							</p>
						) : (
							<table className="w-full text-sm">
								<thead className="border-b text-left text-muted-foreground">
									<tr>
										<th className="pb-2">Título</th>
										<th>Contato</th>
										<th>Stage</th>
										<th>Temp</th>
										<th>Criado</th>
									</tr>
								</thead>
								<tbody>
									{leads.map((l) => (
										<tr key={l.id} className="border-b">
											<td className="py-2 font-medium">{l.title}</td>
											<td>{l.contactName}</td>
											<td>{l.stageName}</td>
											<td>{l.temperature}</td>
											<td className="text-xs text-muted-foreground">
												{new Date(l.createdAt).toLocaleString("pt-BR")}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</Card>
				</TabsContent>

				<TabsContent value="agenda" className="mt-4">
					<Card className="p-4">
						{events.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								Nenhum evento sandbox ainda. Atendente cria eventos via tool agendarEvento.
							</p>
						) : (
							<ul className="space-y-2">
								{events.map((e) => (
									<li key={e.id} className="rounded border p-3 text-sm">
										<div className="font-medium">{e.title}</div>
										<div className="text-xs text-muted-foreground">
											{new Date(e.startAt).toLocaleString("pt-BR")} · {e.duration}
										</div>
									</li>
								))}
							</ul>
						)}
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
