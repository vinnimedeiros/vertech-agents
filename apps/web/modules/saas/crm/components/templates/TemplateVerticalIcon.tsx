"use client";

import {
	Briefcase,
	Building2,
	GraduationCap,
	Home,
	Megaphone,
	ShoppingCart,
	Sparkles,
	Stethoscope,
	Store,
	WrenchIcon,
} from "lucide-react";
import type { ComponentType } from "react";

const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
	Sparkles,
	Briefcase,
	Stethoscope,
	ShoppingCart,
	Home,
	GraduationCap,
	Megaphone,
	Store,
	Building: Building2,
	Wrench: WrenchIcon,
};

export function TemplateVerticalIcon({
	iconKey,
	className,
}: {
	iconKey?: string | null;
	className?: string;
}) {
	const Icon = iconKey && ICON_MAP[iconKey] ? ICON_MAP[iconKey] : Sparkles;
	return <Icon className={className} />;
}
