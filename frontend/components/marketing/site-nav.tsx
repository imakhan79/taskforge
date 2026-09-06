import Link from "next/link";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#security", label: "Security" },
  { href: "/#templates", label: "Templates" },
  { href: "/#pricing", label: "Pricing" },
];

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Bot className="size-4" />
          </span>
          TaskForge
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Create automation</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
