"use client";

import { Button } from "@ui/components/button";
import { Separator } from "@ui/components/separator";
import { cn } from "@ui/lib";
import { Plus } from "lucide-react";
import { CalendarPicker } from "./CalendarPicker";
import { CalendarsList } from "./CalendarsList";
import type { CalendarEventRow, CalendarRow } from "../types";

type Props = {
	selectedDate: Date;
	onDateSelect: (date: Date) => void;
	onNewEvent: () => void;
	onNewCalendar: () => void;
	calendars: CalendarRow[];
	events: CalendarEventRow[];
	organizationSlug: string;
	className?: string;
};

export function AgendaSidebar({
	selectedDate,
	onDateSelect,
	onNewEvent,
	onNewCalendar,
	calendars,
	events,
	organizationSlug,
	className,
}: Props) {
	const eventDates = Object.values(
		events.reduce(
			(acc, e) => {
				const key = new Date(
					e.startAt.getFullYear(),
					e.startAt.getMonth(),
					e.startAt.getDate(),
				).toDateString();
				acc[key] = {
					date: new Date(
						e.startAt.getFullYear(),
						e.startAt.getMonth(),
						e.startAt.getDate(),
					),
					count: (acc[key]?.count ?? 0) + 1,
				};
				return acc;
			},
			{} as Record<string, { date: Date; count: number }>,
		),
	);

	return (
		<div className={cn("flex h-full flex-col bg-background", className)}>
			<div className="border-b p-4">
				<Button size="lg" className="w-full font-medium" onClick={onNewEvent}>
					<Plus className="mr-2 size-4" />
					Novo Evento
				</Button>
			</div>

			<CalendarPicker
				selectedDate={selectedDate}
				onDateSelect={onDateSelect}
				eventDates={eventDates}
			/>

			<Separator />

			<div className="flex-1 overflow-y-auto p-4">
				<CalendarsList
					calendars={calendars}
					organizationSlug={organizationSlug}
				/>
			</div>

			<div className="border-t p-4">
				<Button
					variant="outline"
					className="w-full justify-start"
					onClick={onNewCalendar}
				>
					<Plus className="mr-2 size-4" />
					Novo calendário
				</Button>
			</div>
		</div>
	);
}
