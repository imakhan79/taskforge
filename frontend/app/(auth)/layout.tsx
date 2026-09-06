import Link from "next/link";
import { Bot } from "lucide-react";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-muted/30 px-6 py-12">
      <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
        <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Bot className="size-4" />
        </span>
        TaskForge
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
