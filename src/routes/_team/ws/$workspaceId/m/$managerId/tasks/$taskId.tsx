import { createFileRoute } from "@tanstack/react-router";
import { TaskScreen } from "~/modules/team-build/service.ts";

function Task() {
  const { workspaceId, managerId, taskId } = Route.useParams();
  return <TaskScreen key={taskId} workspaceId={workspaceId} managerId={managerId} taskId={taskId} />;
}

export const Route = createFileRoute("/_team/ws/$workspaceId/m/$managerId/tasks/$taskId")({ component: Task });
