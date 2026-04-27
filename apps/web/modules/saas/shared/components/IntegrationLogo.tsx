import { cn } from "@ui/lib";

type Props = {
	provider: "whatsapp" | "google";
	className?: string;
};

/**
 * Logos oficiais SVG inline de provedores de integração. Mantém fidelidade
 * à brand do provider (WhatsApp green / Google multicor) sem depender de
 * imagens externas.
 */
export function IntegrationLogo({ provider, className }: Props) {
	if (provider === "whatsapp") {
		return (
			<svg
				viewBox="0 0 32 32"
				role="img"
				aria-label="WhatsApp"
				className={cn("shrink-0", className)}
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					fill="#25D366"
					d="M16 0C7.163 0 0 7.163 0 16c0 2.823.737 5.582 2.137 8.012L0 32l8.205-2.155A15.94 15.94 0 0 0 16 32c8.837 0 16-7.163 16-16S24.837 0 16 0z"
				/>
				<path
					fill="#fff"
					d="M23.394 19.59c-.39-.196-2.31-1.139-2.668-1.27-.358-.13-.618-.196-.879.196-.26.391-1.009 1.27-1.237 1.531-.228.26-.456.293-.846.098-.39-.196-1.65-.609-3.143-1.94-1.16-1.035-1.943-2.31-2.171-2.7-.228-.391-.025-.602.171-.797.176-.175.39-.456.586-.685.196-.228.26-.391.39-.652.13-.26.065-.489-.033-.685-.098-.196-.879-2.115-1.204-2.896-.317-.762-.64-.658-.879-.671a16.21 16.21 0 0 0-.749-.013.435.435 0 0 0-.585.196c-.358.391-1.367 1.336-1.367 3.255 0 1.92 1.4 3.775 1.595 4.036.196.26 2.755 4.207 6.676 5.901 4.026 1.74 4.026 1.16 4.752 1.087.726-.073 2.31-.945 2.635-1.857.326-.913.326-1.694.228-1.857-.098-.163-.358-.26-.748-.456z"
				/>
			</svg>
		);
	}

	return (
		<svg
			viewBox="0 0 32 32"
			role="img"
			aria-label="Google Calendar"
			className={cn("shrink-0", className)}
			xmlns="http://www.w3.org/2000/svg"
		>
			<rect x="3" y="3" width="26" height="26" rx="3" fill="#fff" />
			<path
				fill="#1A73E8"
				d="M22 3h4a3 3 0 0 1 3 3v4h-7V3z"
			/>
			<path fill="#EA4335" d="M22 22h7v4a3 3 0 0 1-3 3h-4v-7z" />
			<path fill="#34A853" d="M3 22h7v7H6a3 3 0 0 1-3-3v-4z" />
			<path fill="#FBBC04" d="M3 6a3 3 0 0 1 3-3h4v7H3V6z" />
			<text
				x="16"
				y="22"
				textAnchor="middle"
				fontSize="13"
				fontWeight="600"
				fill="#1A73E8"
				fontFamily="system-ui,-apple-system,sans-serif"
			>
				31
			</text>
		</svg>
	);
}
