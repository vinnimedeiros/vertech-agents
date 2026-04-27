import { Skeleton } from "@ui/components/skeleton";
import { cn } from "@ui/lib";

const PANEL = cn(
	"rounded-xl border border-border/40 bg-card/95 backdrop-blur",
	"shadow-[0_10px_40px_-20px_rgba(0,0,0,0.18),0_4px_12px_-6px_rgba(0,0,0,0.08)]",
	"dark:bg-card/85 dark:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)]",
);

export function TeamCardSkeleton() {
	return (
		<div
			className={cn(
				"flex flex-col gap-3 rounded-xl border border-border/40 bg-card/60 p-4",
			)}
		>
			<div className="flex items-center gap-3">
				<Skeleton className="size-10 rounded-lg" />
				<div className="flex flex-1 flex-col gap-1.5">
					<Skeleton className="h-3.5 w-2/3" />
					<Skeleton className="h-2.5 w-1/3" />
				</div>
				<Skeleton className="h-5 w-14 rounded-full" />
			</div>
			<Skeleton className="h-3 w-full" />
			<Skeleton className="h-3 w-4/5" />
			<div className="flex gap-2 pt-1">
				<Skeleton className="h-6 w-16 rounded-md" />
				<Skeleton className="h-6 w-16 rounded-md" />
				<Skeleton className="h-6 w-16 rounded-md" />
			</div>
		</div>
	);
}

export function TeamGridSkeleton() {
	return (
		<div className="flex flex-col gap-5">
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-4">
					<Skeleton className="h-7 w-32" />
					<span className="hidden h-4 w-px bg-border sm:block" />
					<Skeleton className="hidden h-3 w-64 sm:block" />
				</div>
				<Skeleton className="h-8 w-28" />
			</div>
			<div className="flex gap-2">
				<Skeleton className="h-7 w-20 rounded-full" />
				<Skeleton className="h-7 w-24 rounded-full" />
				<Skeleton className="h-7 w-24 rounded-full" />
				<Skeleton className="h-7 w-24 rounded-full" />
				<Skeleton className="h-7 w-20 rounded-full" />
			</div>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<TeamCardSkeleton key={`team-skel-${String(i)}`} />
				))}
			</div>
		</div>
	);
}

export function TeamCanvasSkeleton() {
	return (
		<div className="flex h-full min-h-0 flex-col gap-3 p-3">
			<div className={cn(PANEL, "flex shrink-0 items-center justify-between gap-4 px-4 py-2")}>
				<div className="flex items-center gap-3">
					<Skeleton className="size-7 rounded-md" />
					<Skeleton className="h-4 w-40" />
					<Skeleton className="h-5 w-16 rounded-full" />
				</div>
				<div className="flex items-center gap-2">
					<Skeleton className="h-7 w-24" />
					<Skeleton className="h-7 w-20" />
				</div>
			</div>
			<div className="relative flex min-h-0 flex-1 items-start justify-center overflow-hidden">
				<div className="flex flex-col items-center gap-12 pt-12">
					<Skeleton className="h-[180px] w-[300px] rounded-xl" />
					<div className="flex gap-10">
						<Skeleton className="h-[180px] w-[240px] rounded-xl" />
						<Skeleton className="h-[180px] w-[240px] rounded-xl" />
						<Skeleton className="h-[180px] w-[240px] rounded-xl" />
					</div>
				</div>
			</div>
		</div>
	);
}

export function AgentEditorSkeleton() {
	return (
		<div className="flex h-full min-h-0 flex-col gap-3 p-3">
			<header className={cn(PANEL, "flex shrink-0 items-center justify-between gap-4 px-4 py-2")}>
				<div className="flex items-center gap-3">
					<Skeleton className="size-7 rounded-md" />
					<Skeleton className="h-3.5 w-56" />
				</div>
				<Skeleton className="h-7 w-16" />
			</header>
			<div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
				<div className="flex min-h-0 flex-1 gap-3">
					<aside className={cn(PANEL, "flex w-44 shrink-0 flex-col gap-2 p-3")}>
						{Array.from({ length: 6 }).map((_, i) => (
							<Skeleton
								key={`nav-skel-${String(i)}`}
								className="h-7 w-full rounded-md"
							/>
						))}
					</aside>
					<div className={cn(PANEL, "min-w-0 flex-1 p-6")}>
						<div className="flex items-center justify-center gap-12">
							<Skeleton className="h-[140px] w-[180px] rounded-xl" />
							<Skeleton className="h-[140px] w-[180px] rounded-xl" />
							<Skeleton className="h-[140px] w-[180px] rounded-xl" />
							<Skeleton className="h-[140px] w-[180px] rounded-xl" />
						</div>
					</div>
				</div>
				<div className="flex shrink-0 gap-3">
					<Skeleton className={cn(PANEL, "h-9 flex-1")} />
					<Skeleton className={cn(PANEL, "h-9 flex-1")} />
				</div>
			</div>
		</div>
	);
}
