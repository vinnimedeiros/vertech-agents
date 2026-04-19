import { withContentCollections } from "@content-collections/next";
import type { NextConfig } from "next";
import nextIntlPlugin from "next-intl/plugin";

const withNextIntl = nextIntlPlugin("./modules/i18n/request.ts");

const nextConfig: NextConfig = {
	transpilePackages: [
		"@repo/api",
		"@repo/auth",
		"@repo/database",
		"@repo/utils",
		"@repo/whatsapp",
	],
	// Pacotes Node-only que não devem ser bundlados pelo Turbopack/webpack.
	// Baileys tem optional deps (jimp, sharp, link-preview-js) que só funcionam
	// quando avaliadas em runtime Node — fora do bundle o require() segue nativo.
	serverExternalPackages: [
		"@whiskeysockets/baileys",
		"@hapi/boom",
		"pino",
	],
	experimental: {
		serverActions: {
			// Mídia do chat pode chegar a 25MB (ver lib/upload-actions.ts)
			bodySizeLimit: "30mb",
		},
	},
	images: {
		remotePatterns: [
			{
				// google profile images
				protocol: "https",
				hostname: "lh3.googleusercontent.com",
			},
			{
				// github profile images
				protocol: "https",
				hostname: "avatars.githubusercontent.com",
			},
		],
	},
	async redirects() {
		return [
			{
				source: "/app/settings",
				destination: "/app/settings/general",
				permanent: true,
			},
			{
				source: "/app/:organizationSlug/settings",
				destination: "/app/:organizationSlug/settings/general",
				permanent: true,
			},
			{
				source: "/app/admin",
				destination: "/app/admin/users",
				permanent: true,
			},
		];
	},
	webpack: (config, { webpack }) => {
		config.plugins.push(
			new webpack.IgnorePlugin({
				resourceRegExp: /^pg-native$|^cloudflare:sockets$/,
			}),
		);

		return config;
	},
};

export default withContentCollections(withNextIntl(nextConfig));
