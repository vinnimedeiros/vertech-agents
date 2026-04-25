"use client";

import { Avatar, AvatarFallback } from "@ui/components/avatar";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Card, CardContent } from "@ui/components/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import { Input } from "@ui/components/input";
import { cn } from "@ui/lib";
import {
	addMonths,
	eachDayOfInterval,
	endOfMonth,
	format,
	isSameDay,
	isSameMonth,
	isToday,
	startOfMonth,
	subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	CalendarIcon,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Clock,
	Grid3X3,
	List,
	MapPin,
	Menu,
	Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { EVENT_TYPE_META, type CalendarEventRow, type CalendarRow } from "../types";

type Props = {
	selectedDate: Date;
	onDateSelect: (date: Date) => void;
	onMenuClick: () => void;
	events: CalendarEventRow[];
	calendars: CalendarRow[];
	onEventClick: (event: CalendarEventRow) => void;
	onNewEvent: () => void;
};

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function eventColor(event: CalendarEventRow) {
	if (event.color) return event.color;
	return EVENT_TYPE_META[event.type as keyof typeof EVENT_TYPE_META]?.color ?? "bg-blue-500";
}

export function AgendaMain({
	selectedDate,
	onDateSelect,
	onMenuClick,
	events,
	calendars,
	onEventClick,
	onNewEvent,
}: Props) {
	const [currentDate, setCurrentDate] = useState(selectedDate);
	const [viewMode, setViewMode] = useState<"month" | "list">("month");
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

	const monthStart = startOfMonth(currentDate);
	const monthEnd = endOfMonth(currentDate);
	const calStart = new Date(monthStart);
	calStart.setDate(calStart.getDate() - monthStart.getDay());
	const calEnd = new Date(monthEnd);
	calEnd.setDate(calEnd.getDate() + (6 - monthEnd.getDay()));
	const calendarDays = eachDayOfInterval({ start: calStart, end: calEnd });

	const getEventsForDay = (date: Date) =>
		filteredEvents.filter((e) => isSameDay(e.startAt, date));

	const navigate = (dir: "prev" | "next") => {
		setCurrentDate(dir === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
	};

	const renderMonth = () => (
		<div className="flex-1 bg-background">
			<div className="grid grid-cols-7 border-b">
				{WEEK_DAYS.map((d) => (
					<div
						key={d}
						className="border-r p-4 text-center text-sm font-medium text-muted-foreground last:border-r-0"
					>
						{d}
					</div>
				))}
			</div>
			<div className="grid grid-cols-7">
				{calendarDays.map((day) => {
					const dayEvents = getEventsForDay(day);
					const isCurrentMonth = isSameMonth(day, currentDate);
					const isDayToday = isToday(day);
					const isSelected = selectedDate && isSameDay(day, selectedDate);

					return (
						<button
							type="button"
							key={day.toISOString()}
							onClick={() => onDateSelect(day)}
							className={cn(
								"min-h-[110px] cursor-pointer border-r border-b p-2 text-left transition-colors last:border-r-0",
								isCurrentMonth
									? "bg-background hover:bg-accent/40"
									: "bg-muted/20 text-muted-foreground",
								isSelected && "ring-2 ring-primary ring-inset",
							)}
						>
							<div className="mb-1 flex items-center justify-between">
								<span
									className={cn(
										"text-sm font-medium",
										isDayToday &&
											"inline-flex size-7 items-center justify-center rounded-md bg-primary text-sm text-primary-foreground",
									)}
								>
									{format(day, "d")}
								</span>
								{dayEvents.length > 2 && (
									<span className="text-xs text-muted-foreground">
										+{dayEvents.length - 2}
									</span>
								)}
							</div>
							<div className="space-y-1">
								{dayEvents.slice(0, 2).map((event) => (
									<button
										type="button"
										key={event.id}
										onClick={(e) => {
											e.stopPropagation();
											onEventClick(event);
										}}
										className={cn(
											"w-full truncate rounded-md px-2 py-1 text-left text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-90",
											eventColor(event),
										)}
									>
										<div className="flex items-center gap-1">
											<Clock className="size-3 shrink-0 opacity-80" />
											<span className="truncate">{event.title}</span>
										</div>
									</button>
								))}
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);

	const renderList = () => {
		const upcoming = [...filteredEvents]
			.filter((e) => e.startAt >= new Date(new Date().setHours(0, 0, 0, 0)))
			.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

		if (upcoming.length === 0) {
			return (
				<div className="flex-1 p-10 text-center text-muted-foreground text-sm">
					Nenhum evento futuro. Crie um novo pra começar.
				</div>
			);
		}

		return (
			<div className="flex-1 p-6">
				<div className="space-y-3">
					{upcoming.map((event) => (
						<Card
							key={event.id}
							className="cursor-pointer transition-shadow hover:shadow-md"
							onClick={() => onEventClick(event)}
						>
							<CardContent className="px-4 py-3">
								<div className="flex items-start justify-between gap-4">
									<div className="flex items-start gap-3">
										<div
											className={cn(
												"mt-1.5 size-3 rounded-full",
												eventColor(event),
											)}
										/>
										<div className="flex-1">
											<h3 className="font-medium">{event.title}</h3>
											<div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
												<span className="flex items-center gap-1">
													<CalendarIcon className="size-3.5" />
													{format(event.startAt, "d 'de' MMM, yyyy", {
														locale: ptBR,
													})}
												</span>
												<span className="flex items-center gap-1">
													<Clock className="size-3.5" />
													{format(event.startAt, "HH:mm")} · {event.duration}
												</span>
												{event.location && (
													<span className="flex items-center gap-1">
														<MapPin className="size-3.5" />
														{event.location}
													</span>
												)}
											</div>
										</div>
									</div>
									<div className="flex items-center gap-2">
										{event.attendees.length > 0 && (
											<div className="-space-x-2 flex">
												{event.attendees.slice(0, 3).map((a, i) => (
													<Avatar
														key={`${event.id}-${i}`}
														className="size-7 border-2 border-background"
													>
														<AvatarFallback className="text-[10px]">
															{a.initials ??
																a.name
																	.split(" ")
																	.map((n) => n[0])
																	.join("")
																	.slice(0, 2)
																	.toUpperCase()}
														</AvatarFallback>
													</Avatar>
												))}
											</div>
										)}
										<Badge
											status="info"
											className={cn("text-white border-0", eventColor(event))}
										>
											{
												EVENT_TYPE_META[
													event.type as keyof typeof EVENT_TYPE_META
												]?.label
											}
										</Badge>
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		);
	};

	return (
		<div className="flex h-full flex-col">
			<div className="flex flex-col flex-wrap gap-4 border-b p-6 md:flex-row md:items-center md:justify-between">
				<div className="flex flex-wrap items-center gap-4">
					<Button
						variant="outline"
						size="sm"
						className="xl:hidden"
						onClick={onMenuClick}
					>
						<Menu className="size-4" />
					</Button>

					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => navigate("prev")}
							aria-label="Mês anterior"
						>
							<ChevronLeft className="size-4" />
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => navigate("next")}
							aria-label="Próximo mês"
						>
							<ChevronRight className="size-4" />
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setCurrentDate(new Date())}
						>
							Hoje
						</Button>
					</div>

					<h1 className="text-2xl font-semibold capitalize">
						{format(currentDate, "MMMM yyyy", { locale: ptBR })}
					</h1>
				</div>

				<div className="flex flex-col gap-3 md:flex-row md:items-center">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder="Buscar eventos..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="w-64 pl-10"
						/>
					</div>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline">
								{viewMode === "month" ? (
									<Grid3X3 className="mr-2 size-4" />
								) : (
									<List className="mr-2 size-4" />
								)}
								{viewMode === "month" ? "Mês" : "Lista"}
								<ChevronDown className="ml-2 size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuItem onClick={() => setViewMode("month")}>
								<Grid3X3 className="mr-2 size-4" />
								Mês
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => setViewMode("list")}>
								<List className="mr-2 size-4" />
								Lista
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

					<Button onClick={onNewEvent}>Novo evento</Button>
				</div>
			</div>

			{viewMode === "month" ? renderMonth() : renderList()}
		</div>
	);
}
