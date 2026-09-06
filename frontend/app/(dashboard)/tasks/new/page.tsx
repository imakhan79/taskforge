import type { Metadata } from "next";
import { TaskBuilder } from "@/components/tasks/task-builder";

export const metadata: Metadata = { title: "Create automation" };

export default function NewTaskPage() {
  return <TaskBuilder />;
}
