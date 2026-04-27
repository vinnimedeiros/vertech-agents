"use client";

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
	const [slotDefaultDate, setSlotDefaultDate] = useState<Date | null>(null);
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [showNewCalendar, setShowNewCalendar] = useState(false);

	const openNewEvent = () => {
		setEditingEvent(null);
		setSlotDefaultDate(null);
		setShowEventForm(true);
	};

	const openSlotEditor = (date: Date) => {
		setEditingEvent(null);
		setSlotDefaultDate(date);
		setShowEventForm(true);
	};

	const openEditEvent = (event: CalendarEventRow) => {
		setEditingEvent(event);
		setSlotDefaultDate(null);
		setShowEventForm(true);
	};

	return (
		<>
			<div className="flex h-full min-h-0 flex-1 overflow-hidden rounded-lg border border-border/40 bg-background">
				{sidebarOpen ? (
					<aside className="hidden w-72 shrink-0 border-r border-border/40 xl:block">
						<AgendaSidebar
							selectedDate={selectedDate}
							onDateSelect={setSelectedDate}
							onNewEvent={openNewEvent}
							onNewCalendar={() => setShowNewCalendar(true)}
							calendars={calendars}
							events={events}
							organizationSlug={organizationSlug}
							className="h-full"
						/>
					</aside>
				) : null}

				<div className="flex min-w-0 flex-1 flex-col">
					<AgendaMain
						selectedDate={selectedDate}
						onDateSelect={setSelectedDate}
						onMenuClick={() => setSidebarOpen((v) => !v)}
						events={events}
						calendars={calendars}
						onEventClick={openEditEvent}
						onNewEvent={openNewEvent}
						onSlotClick={openSlotEditor}
					/>
				</div>
			</div>

			<EventForm
				open={showEventForm}
				onOpenChange={setShowEventForm}
				organizationSlug={organizationSlug}
				organizationId={organizationId}
				calendars={calendars}
				event={editingEvent}
				defaultDate={slotDefaultDate ?? selectedDate}
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
