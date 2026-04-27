"use client";

import { SegmentedToggle } from "@saas/shared/components/SegmentedToggle";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { cn } from "@ui/lib";
import {
	addDays,
	addMonths,
	addWeeks,
	eachDayOfInterval,
	endOfMonth,
	endOfWeek,
	format,
	isSameDay,
	isSameMonth,
	isToday,
	startOfMonth,
	startOfWeek,
	subDays,
	subMonths,
	subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	ChevronLeft,
	ChevronRight,
	Menu,
	Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { EVENT_TYPE_META, type CalendarEventRow, type CalendarRow } from "../types";
import { parseDurationToMinutes } from "../lib/recurrence";

type ViewMode = "day" | "week" | "month";

type Props = {
	selectedDate: Date;
	onDateSelect: (date: Date) => void;
	onMenuClick: () => void;
	events: CalendarEventRow[];
	calendars: CalendarRow[];
	onEventClick: (event: CalendarEventRow) => void;
	onNewEvent: () => void;
	onSlotClick?: (date: Date) => void;
};

const VIEW_OPTIONS = [
	{ key: "day" as const, label: "Dia" },
	{ key: "week" as const, label: "Semana" },
	{ key: "month" as const, label: "Mês" },
];

const WEEK_DAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const HOUR_HEIGHT = 48; // px por hora
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function eventColor(event: CalendarEventRow) {
	if (event.color) return event.color;
	return (
		EVENT_TYPE_META[event.type as keyof typeof EVENT_TYPE_META]?.color ??
		"bg-blue-500"
	);
}

export function AgendaMain({
	selectedDate,
	onDateSelect,
	onMenuClick,
	events,
	calendars,
	onEventClick,
	onNewEvent: _onNewEvent,
	onSlotClick,
}: Props) {
	const [currentDate, setCurrentDate] = useState(selectedDate);
	const [viewMode, setViewMode] = useState<ViewMode>("week");
	const [search, setSearch] = useState("");

	const visibleCalendarIds = useMemo(
		() => new Set(calendars.filter((c) => c.visible).map((c) => c.id)),
		[calendars],
	);

	const filteredEvents = useMemo(() => {
		const s = search.trim().toLowerCase();
		return events.filter((e) => {
			if (!visibleCalendarIds.has(e.calendarId)) return false;
			if (s && !e.title.toLowerCase().includes(s)) return false;
			return true;
		});
	}, [events, visibleCalendarIds, search]);

	const weekStart = useMemo(
		() => startOfWeek(currentDate, { weekStartsOn: 0 }),
		[currentDate],
	);
	const weekDays = useMemo(
		() =>
			eachDayOfInterval({
				start: weekStart,
				end: endOfWeek(currentDate, { weekStartsOn: 0 }),
			}),
		[weekStart, currentDate],
	);

	const monthStart = startOfMonth(currentDate);
	const monthEnd = endOfMonth(currentDate);
	const monthCalStart = startOfWeek(monthStart, { weekStartsOn: 0 });
	const monthCalEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
	const monthDays = eachDayOfInterval({
		start: monthCalStart,
		end: monthCalEnd,
	});

	const getEventsForDay = (date: Date) =>
		filteredEvents.filter((e) => isSameDay(e.startAt, date));

	function navigate(dir: "prev" | "next") {
		if (viewMode === "day") {
			setCurrentDate(
				dir === "prev" ? subDays(currentDate, 1) : addDays(currentDate, 1),
			);
		} else if (viewMode === "week") {
			setCurrentDate(
				dir === "prev" ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1),
			);
		} else {
			setCurrentDate(
				dir === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1),
			);
		}
	}

	const periodLabel = useMemo(() => {
		if (viewMode === "day") {
			return format(currentDate, "d 'de' MMMM, yyyy", { locale: ptBR });
		}
		if (viewMode === "week") {
			const start = weekDays[0];
			const end = weekDays[6];
			if (start.getMonth() === end.getMonth()) {
				return `${format(start, "d")} – ${format(end, "d 'de' MMMM, yyyy", { locale: ptBR })}`;
			}
			return `${format(start, "d 'de' MMM", { locale: ptBR })} – ${format(end, "d 'de' MMM, yyyy", { locale: ptBR })}`;
		}
		return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
	}, [viewMode, currentDate, weekDays]);

	return (
		<div className="flex h-full flex-col">
			<div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border/40 px-3 py-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-7 px-2 xl:hidden"
					onClick={onMenuClick}
				>
					<Menu className="size-4" />
				</Button>

				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => setCurrentDate(new Date())}
					className="h-7 px-2.5 text-[11.5px]"
				>
					Hoje
				</Button>

				<div className="flex items-center gap-0.5">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => navigate("prev")}
						className="h-7 w-7 p-0"
						aria-label="Anterior"
					>
						<ChevronLeft className="size-4" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => navigate("next")}
						className="h-7 w-7 p-0"
						aria-label="Próximo"
					>
						<ChevronRight className="size-4" />
					</Button>
				</div>

				<h1
					className="ml-1 text-base font-medium capitalize text-foreground"
					style={{ fontFamily: "var(--font-satoshi)" }}
				>
					{periodLabel}
				</h1>

				<div className="ml-auto flex items-center gap-2">
					<div className="relative">
						<Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-foreground/45" />
						<Input
							placeholder="Buscar eventos..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="h-7 w-48 pl-7 text-[12px]"
						/>
					</div>
					<SegmentedToggle
						items={VIEW_OPTIONS}
						current={viewMode}
						onChange={setViewMode}
					/>
				</div>
			</div>

			<div className="min-h-0 flex-1 overflow-hidden">
				{viewMode === "day" ? (
					<DayView
						day={currentDate}
						events={getEventsForDay(currentDate)}
						onEventClick={onEventClick}
						onSlotClick={onSlotClick}
					/>
				) : viewMode === "week" ? (
					<WeekView
						days={weekDays}
						events={filteredEvents}
						onEventClick={onEventClick}
						onDateSelect={onDateSelect}
						onSlotClick={onSlotClick}
					/>
				) : (
					<MonthView
						days={monthDays}
						currentDate={currentDate}
						selectedDate={selectedDate}
						getEventsForDay={getEventsForDay}
						onDateSelect={onDateSelect}
						onEventClick={onEventClick}
						onSlotClick={onSlotClick}
					/>
				)}
			</div>
		</div>
	);
}

// ============================================================
// Month view
// ============================================================

function MonthView({
	days,
	currentDate,
	selectedDate,
	getEventsForDay,
	onDateSelect,
	onEventClick,
	onSlotClick,
}: {
	days: Date[];
	currentDate: Date;
	selectedDate: Date;
	getEventsForDay: (date: Date) => CalendarEventRow[];
	onDateSelect: (date: Date) => void;
	onEventClick: (event: CalendarEventRow) => void;
	onSlotClick?: (date: Date) => void;
}) {
	return (
		<div className="flex h-full flex-col">
			<div className="grid shrink-0 grid-cols-7 border-b border-border/40">
				{WEEK_DAYS_SHORT.map((d) => (
					<div
						key={d}
						className="border-r border-border/40 px-2 py-1.5 text-center text-[11px] font-medium text-foreground/55 uppercase tracking-wider last:border-r-0"
					>
						{d}
					</div>
				))}
			</div>
			<div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6">
				{days.map((day) => {
					const dayEvents = getEventsForDay(day);
					const isCurrentMonth = isSameMonth(day, currentDate);
					const isDayToday = isToday(day);
					const isSelected = selectedDate && isSameDay(day, selectedDate);

					return (
						<button
							type="button"
							key={day.toISOString()}
							onClick={() => {
								onDateSelect(day);
								if (onSlotClick) {
									const d = new Date(day);
									d.setHours(9, 0, 0, 0);
									onSlotClick(d);
								}
							}}
							className={cn(
								"flex flex-col gap-1 border-r border-b border-border/40 p-1.5 text-left transition-colors last:border-r-0",
								isCurrentMonth
									? "bg-background hover:bg-foreground/[0.02]"
									: "bg-foreground/[0.02] text-foreground/45",
								isSelected && "ring-1 ring-foreground/30 ring-inset",
							)}
						>
							<div className="flex items-center justify-between">
								<span
									className={cn(
										"text-[11.5px] font-medium",
										isDayToday &&
											"inline-flex size-5 items-center justify-center rounded-full bg-foreground text-background",
									)}
								>
									{format(day, "d")}
								</span>
								{dayEvents.length > 3 ? (
									<span className="text-[10px] text-foreground/55">
										+{dayEvents.length - 3}
									</span>
								) : null}
							</div>
							<div className="flex flex-col gap-0.5">
								{dayEvents.slice(0, 3).map((event) => (
									<button
										type="button"
										key={event.id}
										onClick={(e) => {
											e.stopPropagation();
											onEventClick(event);
										}}
										className={cn(
											"truncate rounded px-1.5 py-0.5 text-left text-[10.5px] font-medium text-white transition-opacity hover:opacity-90",
											eventColor(event),
										)}
									>
										{event.title}
									</button>
								))}
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}

// ============================================================
// Week view (7 cols + 24h grid)
// ============================================================

function WeekView({
	days,
	events,
	onEventClick,
	onDateSelect,
	onSlotClick,
}: {
	days: Date[];
	events: CalendarEventRow[];
	onEventClick: (event: CalendarEventRow) => void;
	onDateSelect: (date: Date) => void;
	onSlotClick?: (date: Date) => void;
}) {
	const gridCols = "56px repeat(7, minmax(0, 1fr))";
	return (
		<div className="flex h-full flex-col overflow-hidden">
			<div
				className="grid shrink-0 border-b border-border/40"
				style={{
					gridTemplateColumns: gridCols,
					scrollbarGutter: "stable",
				}}
			>
				<div className="border-r border-border/40" />
				{days.map((day) => (
					<DayHeader key={day.toISOString()} day={day} onClick={onDateSelect} />
				))}
			</div>
			<div
				className="min-h-0 flex-1 overflow-y-auto"
				style={{ scrollbarGutter: "stable" }}
			>
				<div
					className="relative grid"
					style={{
						gridTemplateColumns: gridCols,
						backgroundImage:
							"linear-gradient(to bottom, transparent calc(100% - 1px), color-mix(in srgb, var(--color-foreground) 12%, transparent) calc(100% - 1px))",
						backgroundSize: `100% ${HOUR_HEIGHT}px`,
						backgroundRepeat: "repeat-y",
					}}
				>
					<HoursColumn />
					{days.map((day) => (
						<DayColumn
							key={day.toISOString()}
							day={day}
							events={events.filter((e) => isSameDay(e.startAt, day))}
							onEventClick={onEventClick}
							onSlotClick={onSlotClick}
						/>
					))}
				</div>
			</div>
		</div>
	);
}

// ============================================================
// Day view (1 col + 24h grid)
// ============================================================

function DayView({
	day,
	events,
	onEventClick,
	onSlotClick,
}: {
	day: Date;
	events: CalendarEventRow[];
	onEventClick: (event: CalendarEventRow) => void;
	onSlotClick?: (date: Date) => void;
}) {
	const gridCols = "56px minmax(0, 1fr)";
	return (
		<div className="flex h-full flex-col overflow-hidden">
			<div
				className="grid shrink-0 border-b border-border/40"
				style={{
					gridTemplateColumns: gridCols,
					scrollbarGutter: "stable",
				}}
			>
				<div className="border-r border-border/40" />
				<DayHeader day={day} prominent />
			</div>
			<div
				className="min-h-0 flex-1 overflow-y-auto"
				style={{ scrollbarGutter: "stable" }}
			>
				<div
					className="relative grid"
					style={{
						gridTemplateColumns: gridCols,
						backgroundImage:
							"linear-gradient(to bottom, transparent calc(100% - 1px), color-mix(in srgb, var(--color-foreground) 12%, transparent) calc(100% - 1px))",
						backgroundSize: `100% ${HOUR_HEIGHT}px`,
						backgroundRepeat: "repeat-y",
					}}
				>
					<HoursColumn />
					<DayColumn
						day={day}
						events={events}
						onEventClick={onEventClick}
						onSlotClick={onSlotClick}
					/>
				</div>
			</div>
		</div>
	);
}

// ============================================================
// Sub-components
// ============================================================

function DayHeader({
	day,
	prominent,
	onClick,
}: {
	day: Date;
	prominent?: boolean;
	onClick?: (date: Date) => void;
}) {
	const today = isToday(day);
	return (
		<button
			type="button"
			onClick={() => onClick?.(day)}
			disabled={!onClick}
			className={cn(
				"flex flex-col items-center justify-center gap-0.5 border-r border-border/40 px-2 py-2 last:border-r-0",
				onClick && "transition-colors hover:bg-foreground/[0.03]",
			)}
		>
			<span
				className={cn(
					"text-[10.5px] font-medium uppercase tracking-wider",
					today ? "text-foreground" : "text-foreground/55",
				)}
			>
				{WEEK_DAYS_SHORT[day.getDay()]}.
			</span>
			<span
				className={cn(
					"flex items-center justify-center font-medium",
					prominent ? "text-2xl" : "text-lg",
					today
						? cn(
								"rounded-full bg-foreground text-background",
								prominent ? "size-10" : "size-7",
							)
						: "text-foreground",
				)}
				style={{ fontFamily: "var(--font-satoshi)" }}
			>
				{format(day, "d")}
			</span>
		</button>
	);
}

function HoursColumn() {
	return (
		<div
			className="relative border-r border-border/40"
			style={{ height: `${HOUR_HEIGHT * 24}px` }}
		>
			{HOURS.map((h) => (
				<div
					key={h}
					className="absolute right-1.5 -translate-y-1/2 bg-background px-1 text-[10px] text-foreground/45"
					style={{ top: `${h * HOUR_HEIGHT}px` }}
				>
					{h === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
				</div>
			))}
		</div>
	);
}

function DayColumn({
	day,
	events,
	onEventClick,
	onSlotClick,
}: {
	day: Date;
	events: CalendarEventRow[];
	onEventClick: (event: CalendarEventRow) => void;
	onSlotClick?: (date: Date) => void;
}) {
	const dayToday = isToday(day);
	const now = new Date();
	const nowMinutes = dayToday ? now.getHours() * 60 + now.getMinutes() : null;

	const SLOT_MINUTES = 30;
	const SLOTS_PER_DAY = (24 * 60) / SLOT_MINUTES; // 48
	const SLOT_HEIGHT = HOUR_HEIGHT / 2; // 24px

	return (
		<div
			className="relative border-r border-border/40 last:border-r-0"
			style={{ height: `${HOUR_HEIGHT * 24}px` }}
		>
			{Array.from({ length: SLOTS_PER_DAY }).map((_, i) => {
				const hour = Math.floor((i * SLOT_MINUTES) / 60);
				const minute = (i * SLOT_MINUTES) % 60;
				return (
					<button
						key={i}
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							if (!onSlotClick) return;
							const slotDate = new Date(day);
							slotDate.setHours(hour, minute, 0, 0);
							onSlotClick(slotDate);
						}}
						className={cn(
							"absolute left-0 right-0 cursor-pointer transition-colors",
							"hover:bg-foreground/[0.04]",
							"focus-visible:outline-hidden focus-visible:bg-foreground/[0.05]",
						)}
						style={{
							top: `${i * SLOT_HEIGHT}px`,
							height: `${SLOT_HEIGHT}px`,
						}}
						aria-label={`Criar evento ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`}
					/>
				);
			})}

			{nowMinutes !== null ? (
				<div
					className="pointer-events-none absolute left-0 right-0 flex items-center"
					style={{ top: `${(nowMinutes / 60) * HOUR_HEIGHT}px` }}
				>
					<span className="size-2 -ml-1 rounded-full bg-rose-500" />
					<span className="h-px flex-1 bg-rose-500" />
				</div>
			) : null}

			{events.map((event) => {
				const start = new Date(event.startAt);
				const startMin = start.getHours() * 60 + start.getMinutes();
				const durMin = parseDurationToMinutes(event.duration);
				const top = (startMin / 60) * HOUR_HEIGHT;
				const height = Math.max(20, (durMin / 60) * HOUR_HEIGHT);

				return (
					<button
						type="button"
						key={event.id}
						onClick={(e) => {
							e.stopPropagation();
							onEventClick(event);
						}}
						className={cn(
							"absolute left-1 right-1 flex flex-col gap-0.5 overflow-hidden rounded px-1.5 py-1 text-left text-[10.5px] font-medium text-white shadow-sm transition-opacity hover:opacity-90",
							eventColor(event),
						)}
						style={{ top: `${top}px`, height: `${height}px` }}
					>
						<span className="truncate font-semibold">{event.title}</span>
						<span className="truncate text-[10px] opacity-90">
							{format(start, "HH:mm")} · {event.duration}
						</span>
					</button>
				);
			})}
		</div>
	);
}
