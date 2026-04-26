import { StudioCanvas } from "@saas/ai-studio/components/StudioCanvas";
import { TeamCanvasSkeleton } from "@saas/ai-studio/components/StudioSkeletons";

export default function TeamBuilderLoading() {
	return (
		<StudioCanvas>
			<TeamCanvasSkeleton />
		</StudioCanvas>
	);
}
