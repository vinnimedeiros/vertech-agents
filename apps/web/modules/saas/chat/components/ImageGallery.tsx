"use client";

import { cn } from "@ui/lib";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from "react";

export type GalleryImage = {
	id: string;
	url: string;
	fileName: string | null;
	caption: string | null;
};

type GalleryContextValue = {
	items: GalleryImage[];
	open: (id: string) => void;
};

const GalleryContext = createContext<GalleryContextValue | null>(null);

export function useImageGallery(): GalleryContextValue {
	const ctx = useContext(GalleryContext);
	if (!ctx) {
		throw new Error(
			"useImageGallery precisa estar dentro de <ImageGalleryProvider>",
		);
	}
	return ctx;
}

type Props = {
	items: GalleryImage[];
	children: ReactNode;
};

export function ImageGalleryProvider({ items, children }: Props) {
	const [activeId, setActiveId] = useState<string | null>(null);

	const close = useCallback(() => setActiveId(null), []);

	const currentIndex = useMemo(() => {
		if (!activeId) return -1;
		return items.findIndex((i) => i.id === activeId);
	}, [items, activeId]);

	const navigate = useCallback(
		(direction: 1 | -1) => {
			if (items.length === 0 || currentIndex === -1) return;
			const nextIndex =
				(currentIndex + direction + items.length) % items.length;
			setActiveId(items[nextIndex].id);
		},
		[items, currentIndex],
	);

	// Teclado: Esc fecha, ← → navega
	useEffect(() => {
		if (!activeId) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				close();
			} else if (e.key === "ArrowLeft") {
				e.preventDefault();
				navigate(-1);
			} else if (e.key === "ArrowRight") {
				e.preventDefault();
				navigate(1);
			}
		};
		window.addEventListener("keydown", handler);
		// Trava scroll do body enquanto aberto
		const originalOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			window.removeEventListener("keydown", handler);
			document.body.style.overflow = originalOverflow;
		};
	}, [activeId, close, navigate]);

	const open = useCallback((id: string) => setActiveId(id), []);

	const value = useMemo(() => ({ items, open }), [items, open]);

	const current = currentIndex >= 0 ? items[currentIndex] : null;

	return (
		<GalleryContext.Provider value={value}>
			{children}
			{current ? (
				<ImageLightbox
					current={current}
					currentIndex={currentIndex}
					items={items}
					onClose={close}
					onPrev={() => navigate(-1)}
					onNext={() => navigate(1)}
					onSelect={(id) => setActiveId(id)}
				/>
			) : null}
		</GalleryContext.Provider>
	);
}

function ImageLightbox({
	current,
	currentIndex,
	items,
	onClose,
	onPrev,
	onNext,
	onSelect,
}: {
	current: GalleryImage;
	currentIndex: number;
	items: GalleryImage[];
	onClose: () => void;
	onPrev: () => void;
	onNext: () => void;
	onSelect: (id: string) => void;
}) {
	const hasMultiple = items.length > 1;

	return (
		<div
			className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-md"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
		>
			{/* Top bar: fileName + contador + close */}
			<div
				className="flex items-center justify-between px-4 py-3 text-white/90"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="min-w-0 flex-1 text-sm">
					<span className="truncate font-medium">
						{current.fileName ?? "Imagem"}
					</span>
					{hasMultiple ? (
						<span className="ml-3 text-white/55">
							{currentIndex + 1} de {items.length}
						</span>
					) : null}
				</div>
				<button
					type="button"
					onClick={onClose}
					className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white"
					aria-label="Fechar"
				>
					<XIcon className="size-5" />
				</button>
			</div>

			{/* Center: image + arrows */}
			<div className="relative flex flex-1 items-center justify-center overflow-hidden px-4">
				{hasMultiple ? (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onPrev();
						}}
						className="absolute left-4 z-10 rounded-full bg-white/10 p-2 text-white/80 hover:bg-white/20 hover:text-white"
						aria-label="Imagem anterior"
					>
						<ChevronLeftIcon className="size-6" />
					</button>
				) : null}

				<img
					src={current.url}
					alt={current.fileName ?? "Imagem"}
					className="max-h-full max-w-full object-contain"
					onClick={(e) => e.stopPropagation()}
				/>

				{hasMultiple ? (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onNext();
						}}
						className="absolute right-4 z-10 rounded-full bg-white/10 p-2 text-white/80 hover:bg-white/20 hover:text-white"
						aria-label="Próxima imagem"
					>
						<ChevronRightIcon className="size-6" />
					</button>
				) : null}
			</div>

			{/* Caption */}
			{current.caption ? (
				<div
					className="px-6 pb-2 text-center text-sm text-white/80"
					onClick={(e) => e.stopPropagation()}
				>
					{current.caption}
				</div>
			) : null}

			{/* Bottom strip: thumbnails */}
			{hasMultiple ? (
				<div
					className="flex shrink-0 items-center justify-center gap-2 overflow-x-auto px-4 py-3"
					onClick={(e) => e.stopPropagation()}
				>
					{items.map((it, idx) => (
						<button
							key={it.id}
							type="button"
							onClick={() => onSelect(it.id)}
							className={cn(
								"h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 transition-opacity",
								idx === currentIndex
									? "border-white opacity-100"
									: "border-transparent opacity-60 hover:opacity-90",
							)}
							aria-label={`Ir pra imagem ${idx + 1}`}
						>
							<img
								src={it.url}
								alt=""
								className="h-full w-full object-cover"
							/>
						</button>
					))}
				</div>
			) : null}
		</div>
	);
}
