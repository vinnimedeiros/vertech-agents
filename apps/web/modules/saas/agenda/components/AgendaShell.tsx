"use client";

import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@ui/components/sheet";
import { useState } from "react";
import { AgendaMain } from "./AgendaMain";
import { AgendaSidebar } from "./AgendaSidebar";
import { EventForm } from "./EventForm";
import { NewCalendarDialog } from "./NewCalendarDialog";
import type { CalendarEventRow, CalendarRow } from "../types";

type Props = {
	organizationId: string;
	organizationSlug: string;
	calendars: CalendarRow[];
	events: CalendarEventRow[];
};

export function AgendaShell({
	organizationId,
	organizationSlug,
	calendars,
	events,
}: Props) {
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());
	const [showEventForm, setShowEventForm] = useState(false);
	const [editingEvent, setEditingEvent] = useState<CalendarEventRow | null>(
		null,
	);
	const [showSidebarSheet, setShowSidebarSheet] = useState(false);
	const [showNewCalendar, setShowNewCalendar] = useState(false);

	const openNewEvent = () => {
		setEditingEvent(null);
		setShowEventForm(true);
	};

	const openEditEvent = (event: CalendarEventRow) => {
		setEditingEvent(event);
		setShowEventForm(true);
	};

	return (
		<>
			<div className="relative rounded-lg border bg-background">
				<div className="flex min-h-[800px]">
					<div className="hidden w-80 shrink-0 border-r xl:block">
						<AgendaSidebar
							selectedDate={selectedDate}
							onDateSelect={(d) => {
								setSelectedDate(d);
								setShowSidebarSheet(false);
							}}
							onNewEvent={openNewEvent}
							onNewCalendar={() => setShowNewCalendar(true)}
							calendars={calendars}
							events={events}
							organizationSlug={organizationSlug}
							className="h-full"
						/>
					</div>

					<div className="min-w-0 flex-1">
						<AgendaMain
							selectedDate={selectedDate}
							onDateSelect={setSelectedDate}
							onMenuClick={() => setShowSidebarSheet(true)}
							events={events}
							calendars={calendars}
							onEventClick={openEditEvent}
							onNewEvent={openNewEvent}
						/>
					</div>
				</div>

				<Sheet open={showSidebarSheet} onOpenChange={setShowSidebarSheet}>
					<SheetContent
						side="left"
						className="w-80 p-0"
						style={{ position: "absolute" }}
					>
						<SheetHeader className="p-4 pb-2">
							<SheetTitle>Agenda</SheetTitle>
							<SheetDescription>
								Navegue pelas datas e gerencie seus eventos.
							</SheetDescription>
						</SheetHeader>
						<AgendaSidebar
							selectedDate={selectedDate}
							onDateSelect={(d) => {
								setSelectedDate(d);
								setShowSidebarSheet(false);
							}}
							onNewEvent={openNewEvent}
							onNewCalendar={() => setShowNewCalendar(true)}
							calendars={calendars}
							events={events}
							organizationSlug={organizationSlug}
							className="h-full"
						/>
					</SheetContent>
				</Sheet>
			</div>

			<EventForm
				open={showEventForm}
				onOpenChange={setShowEventForm}
				organizationSlug={organizationSlug}
				organizationId={organizationId}
				calendars={calendars}
				event={editingEvent}
				defaultDate={selectedDate}
			/>

			<NewCalendarDialog
				open={showNewCalendar}
				onOpenChange={setShowNewCalendar}
				organizationId={organizationId}
				organizationSlug={organizationSlug}
			/>
		</>
	);
}
