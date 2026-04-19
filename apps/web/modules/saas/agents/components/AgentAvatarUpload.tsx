"use client";

import { config } from "@repo/config";
import { CropImageDialog } from "@saas/settings/components/CropImageDialog";
import { useSignedUploadUrlMutation } from "@saas/shared/lib/api";
import { Spinner } from "@shared/components/Spinner";
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar";
import { Button } from "@ui/components/button";
import { CameraIcon } from "lucide-react";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import {
	getAgentInitials,
	resolveAgentAvatarUrl,
} from "../lib/avatar-helpers";

type Props = {
	agentId: string;
	name: string;
	currentValue: string | null;
	onChange: (path: string) => void;
	disabled?: boolean;
};

/**
 * Upload de avatar pro agente.
 *
 * Fluxo:
 * 1. User solta imagem → CropImageDialog abre
 * 2. Ao confirmar crop → upload direto pro bucket `avatars`
 *    com path `agent-{agentId}/{uuid}.png`
 * 3. Path retornado e passado pro `onChange` → form.setValue marca
 *    avatarUrl como dirty. User salva a aba pra persistir no DB.
 *
 * Diferenca do UserAvatarUpload: nao persiste imediatamente no DB.
 * Fica em state de "mudanca nao salva" ate o user clicar Salvar na aba.
 */
export function AgentAvatarUpload({
	agentId,
	name,
	currentValue,
	onChange,
	disabled,
}: Props) {
	const [uploading, setUploading] = useState(false);
	const [cropDialogOpen, setCropDialogOpen] = useState(false);
	const [image, setImage] = useState<File | null>(null);
	const getSignedUploadUrlMutation = useSignedUploadUrlMutation();

	const { getRootProps, getInputProps, open } = useDropzone({
		onDrop: (acceptedFiles) => {
			setImage(acceptedFiles[0]);
			setCropDialogOpen(true);
		},
		accept: {
			"image/png": [".png"],
			"image/jpeg": [".jpg", ".jpeg"],
			"image/webp": [".webp"],
		},
		multiple: false,
		noClick: true,
		noKeyboard: true,
		disabled,
	});

	const onCrop = async (croppedImageData: Blob | null) => {
		if (!croppedImageData) return;

		setUploading(true);
		try {
			const path = `agent-${agentId}/${uuid()}.png`;
			const { signedUrl } = await getSignedUploadUrlMutation.mutateAsync({
				path,
				bucket: config.storage.bucketNames.avatars,
			});

			const response = await fetch(signedUrl, {
				method: "PUT",
				body: croppedImageData,
				headers: { "Content-Type": "image/png" },
			});

			if (!response.ok) {
				throw new Error("Upload failed");
			}

			onChange(path);
			toast.success("Avatar atualizado. Salve a aba pra confirmar.");
		} catch (err) {
			console.error(err);
			toast.error("Não foi possível enviar a imagem.");
		} finally {
			setUploading(false);
			setImage(null);
		}
	};

	const resolvedSrc = resolveAgentAvatarUrl(currentValue);
	const initials = getAgentInitials(name);

	return (
		<div className="flex items-center gap-4">
			<div
				className="relative size-24 shrink-0 overflow-hidden rounded-lg"
				{...getRootProps()}
			>
				<input {...getInputProps()} />
				<Avatar className="size-24 rounded-lg">
					{resolvedSrc ? (
						<AvatarImage
							src={resolvedSrc}
							alt=""
							className="rounded-lg"
						/>
					) : null}
					<AvatarFallback className="rounded-lg bg-primary/10 text-primary text-2xl">
						{initials}
					</AvatarFallback>
				</Avatar>
				{uploading ? (
					<div className="absolute inset-0 z-20 flex items-center justify-center bg-card/90">
						<Spinner className="size-6" />
					</div>
				) : null}
			</div>

			<div className="flex flex-col gap-1">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={open}
					disabled={disabled || uploading}
				>
					<CameraIcon className="mr-2 size-4" />
					{currentValue ? "Trocar avatar" : "Enviar avatar"}
				</Button>
				<p className="text-foreground/60 text-xs">
					PNG, JPG ou WebP. Máx 2MB.
				</p>
			</div>

			<CropImageDialog
				image={image}
				open={cropDialogOpen}
				onOpenChange={setCropDialogOpen}
				onCrop={onCrop}
			/>
		</div>
	);
}
