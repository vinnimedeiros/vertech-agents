"use client";

import { Calendar } from "@ui/components/calendar";
import { ptBR } from "date-fns/locale";

type Props = {
	selectedDate?: Date;
	onDateSelect?: (date: Date) => void;
	eventDates?: Array<{ date: Date; count: number }>;
};

/**
 * Date picker da sidebar da Agenda.
 * Marca dias com eventos via after:content dot.
 */
export function CalendarPicker({
	selectedDate,
	onDateSelect,
	eventDates = [],
}: Props) {
	const eventDatesMap = eventDates.reduce(
		(acc, ev) => {
			acc[ev.date.toDateString()] = ev.count;
			return acc;
		},
		{} as Record<string, number>,
	);

	return (
		<div className="flex justify-center">
			<Calendar
				mode="single"
				selected={selectedDate}
				onSelect={(d) => d && onDateSelect?.(d)}
				locale={ptBR}
				className="w-full [&_[role=gridcell]_button]:cursor-pointer [&_button]:cursor-pointer"
				modifiers={{
					hasEvents: (date) => {
						const cnt = eventDatesMap[date.toDateString()];
						return Boolean(cnt && cnt > 0);
					},
				}}
				modifiersClassNames={{
					hasEvents:
						"relative after:absolute after:bottom-1 after:right-1 after:w-1.5 after:h-1.5 after:bg-primary after:rounded-full",
				}}
			/>
		</div>
	);
}
