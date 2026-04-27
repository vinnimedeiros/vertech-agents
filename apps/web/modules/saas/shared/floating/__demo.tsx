"use client";

import {
	BarChart3Icon,
	FlameIcon,
	HandshakeIcon,
	TargetIcon,
	TrendingUpIcon,
	UsersIcon,
} from "lucide-react";
import { useState } from "react";
import {
	FloatingCanvas,
	FloatingHeader,
	type FloatingTabItem,
	FloatingTabs,
	MetricCard,
} from "./index";

/**
 * Demo / showcase dos componentes floating canônicos.
 *
 * NÃO está wirado em rota. Serve só como referência visual quando os
 * blocos B/C/D/E/H/I.2 forem aplicados. Pra testar manualmente, plugar
 * temporariamente em qualquer rota:
 *
 *   import { FloatingShowcase } from "@saas/shared/floating/__demo";
 *   export default function Page() { return <FloatingShowcase />; }
 */

type DemoTab = "geral" | "leads" | "campanhas" | "follow";

const TABS: FloatingTabItem<DemoTab>[] = [
	{ key: "geral", label: "Geral", icon: BarChart3Icon },
	{ key: "leads", label: "Leads", icon: UsersIcon, count: 142 },
	{ key: "campanhas", label: "Campanhas", icon: TargetIcon, count: 3 },
	{ key: "follow", label: "Follow-up", icon: HandshakeIcon, count: 27 },
];

export function FloatingShowcase() {
	const [tab, setTab] = useState<DemoTab>("geral");

	return (
		<FloatingCanvas className="min-h-screen">
			<div className="relative z-10 flex flex-col gap-4 p-6">
				<FloatingHeader
					title={
						<h1
							className="font-medium text-[18px] text-foreground"
							style={{ fontFamily: "var(--font-satoshi)" }}
						>
							Comercial
						</h1>
					}
					description="Demo dos componentes floating canônicos."
				/>

				<FloatingHeader>
					<FloatingTabs items={TABS} current={tab} onChange={setTab} />
				</FloatingHeader>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<MetricCard
						label="Leads novos"
						value="142"
						trend="+18% vs mês anterior"
						icon={UsersIcon}
						color="cyan"
					/>
					<MetricCard
						label="Em negociação"
						value="38"
						trend="6 esta semana"
						icon={HandshakeIcon}
						color="violet"
					/>
					<MetricCard
						label="Convertidos"
						value="12"
						trend="R$ 84.500 fechados"
						icon={TrendingUpIcon}
						color="lime"
					/>
					<MetricCard
						label="Taxa quente"
						value="22%"
						trend="acima do ideal (15%)"
						icon={FlameIcon}
						color="orange"
					/>
				</div>
			</div>
		</FloatingCanvas>
	);
}
