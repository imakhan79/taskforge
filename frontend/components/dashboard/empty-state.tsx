import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="size-5" />
      </span>
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {actionLabel && actionHref && (
        <Button asChild className="mt-2">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}
