import type { Metadata } from "next";
import { TaskBuilder } from "@/components/tasks/task-builder";

export const metadata: Metadata = { title: "Create automation" };
// No dynamic API is used directly on this page (unlike its sibling pages,
// which call requireCurrentOrg()), so Next attempts to statically
// prerender it despite the dashboard layout being dynamic — forcing it
// dynamic avoids that mismatch.
export const dynamic = "force-dynamic";

export default function NewTaskPage() {
  return <TaskBuilder />;
}
