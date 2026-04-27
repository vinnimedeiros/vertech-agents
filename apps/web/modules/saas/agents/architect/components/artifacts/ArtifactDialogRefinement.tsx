"use client";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@ui/components/accordion";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { Input } from "@ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/components/select";
import { Slider } from "@ui/components/slider";
import { Switch } from "@ui/components/switch";
import { cn } from "@ui/lib";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { TagList } from "../../../components/TagList";
import type { AgentBlueprintContent } from "../../lib/artifact-types";
import {
	type BlueprintRefineInput,
	CAPABILITY_OPTIONS,
	SALES_TECHNIQUE_OPTIONS,
	blueprintRefineSchema,
} from "../../lib/blueprint-schema";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initial: AgentBlueprintContent;
	isSaving: boolean;
	onSave: (data: BlueprintRefineInput) => Promise<void> | void;
};

/**
 * Dialog de refinamento do Blueprint do Agente (story 09.8).
 *
 * Accordion com 7 seções: Identidade, Personalidade (sliders),
 * Anti-patterns, Técnicas Comerciais, Emojis, Voz, Capabilities.
 * Validação via Zod. Mobile: Dialog shadcn já responsivo (scroll
 * interno + max-h).
 */
export function ArtifactDialogRefinement({
	open,
	onOpenChange,
	initial,
	isSaving,
	onSave,
}: Props) {
	const [name, setName] = useState(initial.persona.name);
	const [gender, setGender] = useState(initial.persona.gender);
	const [tone, setTone] = useState(initial.persona.tone);
	const [formality, setFormality] = useState(initial.persona.formality);
	const [humor, setHumor] = useState(initial.persona.humor);
	const [empathy, setEmpathy] = useState(initial.persona.empathy);
	const [antiPatterns, setAntiPatterns] = useState<string[]>(
		initial.persona.antiPatterns,
	);
	const [techniques, setTechniques] = useState(initial.salesTechniques);
	const [emojiMode, setEmojiMode] = useState(initial.emojiConfig.mode);
	const [curatedList, setCuratedList] = useState<string[]>(
		initial.emojiConfig.curatedList ?? [],
	);
	const [voiceEnabled, setVoiceEnabled] = useState(
		initial.voiceConfig.enabled,
	);
	const [voiceProvider, setVoiceProvider] = useState(
		initial.voiceConfig.provider ?? null,
	);
	const [voiceId, setVoiceId] = useState(initial.voiceConfig.voiceId ?? "");
	const [voiceMode, setVoiceMode] = useState(initial.voiceConfig.mode);
	const [capabilities, setCapabilities] = useState<string[]>(
		initial.capabilities,
	);
	const [errors, setErrors] = useState<Record<string, string>>({});

	const toggleCapability = (id: string) => {
		setCapabilities((prev) =>
			prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
		);
	};

	const toggleTechnique = (id: (typeof SALES_TECHNIQUE_OPTIONS)[number]["id"]) => {
		setTechniques((prev) => {
			const existing = prev.find((t) => t.presetId === id);
			if (existing) return prev.filter((t) => t.presetId !== id);
			return [...prev, { presetId: id, intensity: "balanced" }];
		});
	};

	const updateTechniqueIntensity = (
		id: (typeof SALES_TECHNIQUE_OPTIONS)[number]["id"],
		intensity: "soft" | "balanced" | "aggressive",
	) => {
		setTechniques((prev) =>
			prev.map((t) => (t.presetId === id ? { ...t, intensity } : t)),
		);
	};

	const handleSubmit = async () => {
		const payload = {
			persona: {
				name,
				gender,
				tone,
				formality,
				humor,
				empathy,
				antiPatterns,
			},
			salesTechniques: techniques,
			emojiConfig: {
				mode: emojiMode,
				curatedList,
				allowed: initial.emojiConfig.allowed ?? [],
				forbidden: initial.emojiConfig.forbidden ?? [],
			},
			voiceConfig: {
				enabled: voiceEnabled,
				provider: voiceProvider,
				voiceId: voiceEnabled ? voiceId || null : null,
				mode: voiceMode,
				triggers: initial.voiceConfig.triggers ?? [],
			},
			capabilities: capabilities as BlueprintRefineInput["capabilities"],
		};

		const parsed = blueprintRefineSchema.safeParse(payload);
		if (!parsed.success) {
			const next: Record<string, string> = {};
			for (const issue of parsed.error.issues) {
				next[issue.path.join(".")] = issue.message;
			}
			setErrors(next);
			return;
		}
		setErrors({});
		await onSave(parsed.data);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] max-w-[720px] overflow-hidden p-0">
				<DialogHeader className="border-border border-b p-5 pb-4">
					<DialogTitle>Refinar Blueprint do Agente</DialogTitle>
				</DialogHeader>
				<div className="max-h-[calc(85vh-140px)] overflow-y-auto p-5">
					<Accordion
						type="multiple"
						defaultValue={[
							"identity",
							"personality",
							"antipatterns",
							"techniques",
							"emojis",
							"voice",
							"capabilities",
						]}
					>
						<Section id="identity" label="Identidade">
							<Field label="Nome do agente" error={errors["persona.name"]}>
								<Input
									value={name}
									onChange={(e) =>
										setName(e.target.value.slice(0, 50))
									}
									disabled={isSaving}
									maxLength={50}
								/>
							</Field>
							<Field label="Gênero">
								<div className="flex gap-2">
									<GenderPill
										active={gender === "FEMININE"}
										onClick={() => setGender("FEMININE")}
										disabled={isSaving}
									>
										Feminino
									</GenderPill>
									<GenderPill
										active={gender === "MASCULINE"}
										onClick={() => setGender("MASCULINE")}
										disabled={isSaving}
									>
										Masculino
									</GenderPill>
								</div>
							</Field>
						</Section>

						<Section id="personality" label="Personalidade (4 eixos)">
							<LabeledSlider
								label="Tom"
								value={tone}
								onChange={setTone}
								disabled={isSaving}
							/>
							<LabeledSlider
								label="Formalidade"
								value={formality}
								onChange={setFormality}
								disabled={isSaving}
							/>
							<LabeledSlider
								label="Humor"
								value={humor}
								onChange={setHumor}
								disabled={isSaving}
							/>
							<LabeledSlider
								label="Empatia"
								value={empathy}
								onChange={setEmpathy}
								disabled={isSaving}
							/>
						</Section>

						<Section id="antipatterns" label="Anti-patterns">
							<p className="mb-2 text-foreground/60 text-xs">
								Coisas que o agente NUNCA deve fazer.
							</p>
							<TagList
								value={antiPatterns}
								onChange={setAntiPatterns}
								maxItems={20}
								maxItemLength={200}
								placeholder="Ex.: nunca inventar preços, nunca dar diagnóstico médico..."
								disabled={isSaving}
							/>
						</Section>

						<Section id="techniques" label="Técnicas comerciais">
							<div className="space-y-2">
								{SALES_TECHNIQUE_OPTIONS.map((opt) => {
									const t = techniques.find(
										(x) => x.presetId === opt.id,
									);
									const active = !!t;
									return (
										<div
											key={opt.id}
											className="flex items-center justify-between rounded border border-border px-3 py-2"
										>
											<label className="flex items-center gap-2 text-sm">
												<Checkbox
													checked={active}
													onCheckedChange={() =>
														toggleTechnique(opt.id)
													}
													disabled={isSaving}
												/>
												{opt.label}
											</label>
											{active ? (
												<Select
													value={t?.intensity ?? "balanced"}
													onValueChange={(v) =>
														updateTechniqueIntensity(
															opt.id,
															v as
																| "soft"
																| "balanced"
																| "aggressive",
														)
													}
													disabled={isSaving}
												>
													<SelectTrigger className="w-32">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="soft">
															Soft
														</SelectItem>
														<SelectItem value="balanced">
															Balanced
														</SelectItem>
														<SelectItem value="aggressive">
															Aggressive
														</SelectItem>
													</SelectContent>
												</Select>
											) : null}
										</div>
									);
								})}
							</div>
						</Section>

						<Section id="emojis" label="Emojis">
							<Field label="Modo">
								<Select
									value={emojiMode}
									onValueChange={(v) =>
										setEmojiMode(
											v as "none" | "curated" | "free",
										)
									}
									disabled={isSaving}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">
											Nenhum (sem emoji)
										</SelectItem>
										<SelectItem value="curated">
											Curadoria (lista fixa)
										</SelectItem>
										<SelectItem value="free">
											Livre (LLM decide)
										</SelectItem>
									</SelectContent>
								</Select>
							</Field>
							{emojiMode === "curated" ? (
								<Field label="Emojis permitidos">
									<TagList
										value={curatedList}
										onChange={setCuratedList}
										maxItems={30}
										maxItemLength={10}
										placeholder="Ex.: 😊 ✨ 🙂"
										disabled={isSaving}
									/>
								</Field>
							) : null}
						</Section>

						<Section id="voice" label="Voz (TTS)">
							<div className="flex items-center justify-between">
								<span className="text-sm">Voz habilitada</span>
								<Switch
									checked={voiceEnabled}
									onCheckedChange={setVoiceEnabled}
									disabled={isSaving}
								/>
							</div>
							{voiceEnabled ? (
								<>
									<Field label="Provedor">
										<Select
											value={voiceProvider ?? ""}
											onValueChange={(v) =>
												setVoiceProvider(
													v as
														| "elevenlabs"
														| "qwen-self-hosted",
												)
											}
											disabled={isSaving}
										>
											<SelectTrigger>
												<SelectValue placeholder="Escolha um provedor" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="elevenlabs">
													ElevenLabs
												</SelectItem>
												<SelectItem
													value="qwen-self-hosted"
													disabled
												>
													Qwen self-hosted (em breve)
												</SelectItem>
											</SelectContent>
										</Select>
									</Field>
									<Field label="Voice ID">
										<Input
											value={voiceId}
											onChange={(e) =>
												setVoiceId(e.target.value)
											}
											placeholder="Ex.: pNInz6obpgDQGcFmaJgB"
											disabled={isSaving}
										/>
									</Field>
									<Field label="Modo">
										<Select
											value={voiceMode}
											onValueChange={(v) =>
												setVoiceMode(
													v as
														| "always_text"
														| "always_audio"
														| "triggered",
												)
											}
											disabled={isSaving}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="always_text">
													Sempre texto
												</SelectItem>
												<SelectItem value="always_audio">
													Sempre áudio
												</SelectItem>
												<SelectItem value="triggered">
													Somente quando solicitado
												</SelectItem>
											</SelectContent>
										</Select>
									</Field>
								</>
							) : null}
						</Section>

						<Section id="capabilities" label="Capabilities">
							<div className="space-y-2">
								{CAPABILITY_OPTIONS.map((opt) => (
									<label
										key={opt.id}
										className="flex items-center gap-2 rounded border border-border px-3 py-2 text-sm"
									>
										<Checkbox
											checked={capabilities.includes(opt.id)}
											onCheckedChange={() =>
												toggleCapability(opt.id)
											}
											disabled={isSaving}
										/>
										{opt.label}
									</label>
								))}
							</div>
						</Section>
					</Accordion>
				</div>
				<DialogFooter className="border-border border-t bg-background p-4">
					<Button
						variant="ghost"
						onClick={() => onOpenChange(false)}
						disabled={isSaving}
					>
						Cancelar
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={isSaving}
						className="gap-1.5"
					>
						{isSaving ? (
							<>
								<Loader2Icon className="size-3.5 animate-spin" />
								Salvando...
							</>
						) : (
							"Salvar alterações"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function Section({
	id,
	label,
	children,
}: {
	id: string;
	label: string;
	children: React.ReactNode;
}) {
	return (
		<AccordionItem value={id} className="border-border border-b last:border-b-0">
			<AccordionTrigger className="text-sm">{label}</AccordionTrigger>
			<AccordionContent className="space-y-3 pt-2">
				{children}
			</AccordionContent>
		</AccordionItem>
	);
}

function Field({
	label,
	error,
	children,
}: {
	label: string;
	error?: string;
	children: React.ReactNode;
}) {
	return (
		<div>
			<label
				className={cn(
					"mb-1 block font-medium text-foreground/70 text-xs uppercase tracking-wide",
					error && "text-destructive",
				)}
			>
				{label}
			</label>
			{children}
			{error ? (
				<p className="mt-1 text-destructive text-xs">{error}</p>
			) : null}
		</div>
	);
}

function LabeledSlider({
	label,
	value,
	onChange,
	disabled,
}: {
	label: string;
	value: number;
	onChange: (value: number) => void;
	disabled?: boolean;
}) {
	return (
		<div>
			<div className="mb-1 flex items-center justify-between">
				<span className="text-foreground/70 text-xs">{label}</span>
				<span className="font-medium text-foreground text-xs">
					{value}
				</span>
			</div>
			<Slider
				value={[value]}
				min={0}
				max={100}
				step={1}
				onValueChange={(v) => onChange(v[0] ?? 0)}
				disabled={disabled}
			/>
		</div>
	);
}

function GenderPill({
	active,
	onClick,
	disabled,
	children,
}: {
	active: boolean;
	onClick: () => void;
	disabled?: boolean;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				"rounded-full border px-4 py-1.5 font-medium text-sm transition-colors",
				active
					? "border-primary bg-primary text-primary-foreground"
					: "border-border bg-transparent text-foreground/70 hover:border-foreground/30",
				disabled && "opacity-50",
			)}
		>
			{children}
		</button>
	);
}
