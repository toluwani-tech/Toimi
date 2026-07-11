import { CopilotChat } from "@/components/copilot/copilot-chat";
import { requireCompany } from "@/lib/rbac";

export default async function CopilotPage() {
  await requireCompany();

  return (
    <div className="flex max-w-2xl flex-1 flex-col">
      <CopilotChat />
    </div>
  );
}
