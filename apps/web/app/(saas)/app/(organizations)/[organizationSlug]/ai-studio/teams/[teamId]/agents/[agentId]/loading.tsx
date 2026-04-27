import { AgentEditorSkeleton } from "@saas/ai-studio/components/StudioSkeletons";
import { StudioCanvas } from "@saas/ai-studio/components/StudioCanvas";

export default function AgentEditorLoading() {
	return (
		<StudioCanvas>
			<AgentEditorSkeleton />
		</StudioCanvas>
	);
}
