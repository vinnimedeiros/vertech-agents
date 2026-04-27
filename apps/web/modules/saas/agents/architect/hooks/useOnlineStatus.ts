"use client";

import { useEffect, useState } from "react";

/**
 * Hook utilitário que reflete `navigator.onLine` em state (story 09.10).
 *
 * Listens `online`/`offline` events no window. Retorna true inicialmente
 * em SSR (assume online — cliente corrige no mount).
 */
export function useOnlineStatus(): boolean {
	const [isOnline, setIsOnline] = useState(true);

	useEffect(() => {
		if (typeof navigator === "undefined") return;
		setIsOnline(navigator.onLine);
		const handleOnline = () => setIsOnline(true);
		const handleOffline = () => setIsOnline(false);
		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);
		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	return isOnline;
}
