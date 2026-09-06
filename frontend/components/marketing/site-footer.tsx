import Link from "next/link";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#templates", label: "Templates" },
      { href: "/#security", label: "Security" },
      { href: "/#pricing", label: "Pricing" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Sign in" },
      { href: "/signup", label: "Create account" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/#faq", label: "FAQ" },
      { href: "mailto:hello@taskforge.dev", label: "Contact" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <p className="font-semibold tracking-tight">TaskForge</p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Describe repetitive work once. AI plans it, executes it with controlled tools, verifies the
            outcome, and asks for approval when it matters.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="text-sm font-medium">{col.title}</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto max-w-6xl px-6 pb-8 text-xs text-muted-foreground">
        © {new Date().getFullYear()} TaskForge. All rights reserved.
      </div>
    </footer>
  );
}
