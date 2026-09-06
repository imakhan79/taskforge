import Link from "next/link";
import {
  ArrowRight,
  Bot,
  ShieldCheck,
  GitBranch,
  Workflow,
  Timer,
  Lock,
  Activity,
  BarChart3,
  Mail,
  Database,
  FileSpreadsheet,
  Webhook,
  Bell,
  Users,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const flowSteps = [
  { title: "What do you want to automate?", detail: "Describe the work in plain language." },
  { title: "AI generated plan", detail: "The agent produces a structured, reviewable plan." },
  { title: "Review", detail: "See every step, tool, and risk level before anything runs." },
  { title: "Activate", detail: "Turn it on — manual, scheduled, or event-triggered." },
  { title: "Execution", detail: "The agent runs each step through governed tools." },
  { title: "Verification", detail: "Every result is re-checked against the system of record." },
  { title: "Result", detail: "See what happened, what was saved, and what needs you." },
];

const agentModules = [
  { icon: Bot, title: "Intent Analyzer & Planner", desc: "Turns your instruction into a structured, typed plan — never raw text driving execution." },
  { icon: AlertTriangle, title: "Risk Engine", desc: "Every step gets a LOW–CRITICAL risk score from configurable policy, not the model's opinion." },
  { icon: ShieldCheck, title: "Approval Engine", desc: "Risk above your threshold pauses the run and waits for a human decision." },
  { icon: GitBranch, title: "Recovery Engine", desc: "Failures retry with backoff, fall back to alternatives, or escalate to a person." },
  { icon: CheckCircle2, title: "Verification Engine", desc: "Re-queries the real system of record before anything counts as done." },
  { icon: Activity, title: "Memory & Reporting", desc: "Learns organization and task context over time, and reports outcomes with real numbers." },
];

const templates = [
  "Email Triage", "Invoice Processing", "Lead Processing", "Daily Sales Report",
  "Document Classification", "File Organization", "CRM Cleanup", "Customer Support",
];

const integrations = [
  { icon: Mail, label: "Email" },
  { icon: Users, label: "CRM" },
  { icon: FileSpreadsheet, label: "Spreadsheets" },
  { icon: Database, label: "Databases" },
  { icon: Webhook, label: "HTTP / Webhooks" },
  { icon: Bell, label: "Notifications" },
];

const securityPoints = [
  "Row Level Security enforced in Postgres, not just the UI",
  "Role-based access — owner, admin, manager, member, viewer",
  "Untrusted external content is sanitized before it reaches the agent",
  "Outbound HTTP is SSRF-guarded against private and metadata IPs",
  "Every action, approval, and policy change is written to an audit log",
  "Secrets never reach the browser — server-side only, always",
];

const pricingTiers = [
  { name: "Free", price: "$0", tagline: "Try the full pipeline with mock tools.", features: ["1 organization", "3 active automations", "Mock integrations", "Community support"] },
  { name: "Pro", price: "$49", tagline: "For teams automating real workflows.", features: ["Unlimited automations", "Real integrations", "Approval workflows", "Priority support"], highlighted: true },
  { name: "Enterprise", price: "Custom", tagline: "For organizations with compliance needs.", features: ["SSO & advanced RBAC", "Custom risk policies", "Dedicated support", "On-prem agent workers"] },
];

const faqs = [
  { q: "Does the AI act on its own?", a: "Only within limits you set. The risk and policy engines decide what needs approval, and the agent pauses and waits for a human whenever a step crosses your threshold." },
  { q: "What happens if a step fails?", a: "The recovery engine retries with backoff, tries a declared alternative if one exists, and escalates to a human if it still can't complete — nothing silently disappears." },
  { q: "How is my data isolated from other organizations?", a: "Every table is protected by Postgres Row Level Security scoped to your organization, enforced at the database layer — not just filtered in the UI." },
  { q: "Can I see what the agent actually did?", a: "Every execution has a full timeline of tool calls, verification checks, and outcomes, plus an organization-wide audit log." },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-24 text-center sm:py-32">
          <Badge variant="secondary" className="mb-6 gap-1.5">
            <Bot className="size-3.5" /> AI digital workforce, not a chatbot
          </Badge>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            Automate repetitive work with AI
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
            Describe the work. AI plans it. AI executes it. You stay in control — with approvals,
            verification, and a full audit trail on every run.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/signup">
                Create automation <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#how-it-works">View demo flow</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-b border-border/60 bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
            <p className="mt-3 text-muted-foreground">
              The primary experience isn&apos;t a chat window — it&apos;s a controlled pipeline from
              instruction to verified outcome.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {flowSteps.map((step, i) => (
              <Card key={step.title} className="relative">
                <CardHeader>
                  <span className="text-xs font-medium text-primary">Step {i + 1}</span>
                  <CardTitle className="text-base">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{step.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Agent architecture */}
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight">A modular agent, not a black box</h2>
            <p className="mt-3 text-muted-foreground">
              Understanding, planning, and tool selection are AI. Authorization, state, retries, and
              limits are deterministic code — the model never controls critical system state directly.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {agentModules.map((m) => (
              <div key={m.title} className="flex gap-4 rounded-lg border border-border/60 p-5">
                <m.icon className="size-5 shrink-0 text-primary" />
                <div>
                  <p className="font-medium">{m.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Human approval */}
      <section className="border-b border-border/60 bg-muted/30">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">You approve what matters</h2>
            <p className="mt-3 text-muted-foreground">
              High-risk actions — sending external email, writing customer records, spending money —
              pause the run and wait for a real person. The agent resumes only after a decision.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-primary" /> Configurable risk thresholds per organization</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-primary" /> Approve, reject, or edit before it runs</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-primary" /> Every decision recorded in the audit log</li>
            </ul>
          </div>
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Approval required</CardTitle>
                <Badge variant="destructive">High risk</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p><span className="text-muted-foreground">Action:</span> Send customer email</p>
              <p><span className="text-muted-foreground">Recipient:</span> customer@example.com</p>
              <p><span className="text-muted-foreground">Reason:</span> Invoice reminder</p>
              <div className="flex gap-2 pt-2">
                <Button size="sm">Approve</Button>
                <Button size="sm" variant="outline">Edit</Button>
                <Button size="sm" variant="ghost">Reject</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Templates */}
      <section id="templates" className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight">Start from a template</h2>
            <p className="mt-3 text-muted-foreground">
              15 ready-made automations across support, finance, sales, and operations — customize any
              of them or write your own from scratch.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {templates.map((t) => (
              <Badge key={t} variant="outline" className="px-3 py-1.5 text-sm font-normal">
                {t}
              </Badge>
            ))}
            <Badge variant="secondary" className="px-3 py-1.5 text-sm font-normal">+ 7 more</Badge>
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="border-b border-border/60 bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight">Built for enterprise security</h2>
            <p className="mt-3 text-muted-foreground">
              Multi-tenant isolation and least-privilege access are enforced at the database layer, not
              bolted onto the UI.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {securityPoints.map((p) => (
              <div key={p} className="flex items-start gap-3 rounded-lg border border-border/60 bg-background p-4">
                <Lock className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-sm">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Analytics */}
      <section className="border-b border-border/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Know exactly what it&apos;s saving you</h2>
            <p className="mt-3 text-muted-foreground">
              Every execution tracks estimated manual time versus automated time, rolled up by
              automation, team, and organization.
            </p>
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="size-4 text-primary" /> Real-time dashboards, not static reports
            </div>
          </div>
          <Card>
            <CardContent className="grid grid-cols-2 gap-6 py-6">
              <div>
                <p className="text-xs text-muted-foreground">Manual</p>
                <p className="text-2xl font-semibold">15 min</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Automated</p>
                <p className="text-2xl font-semibold">45 sec</p>
              </div>
              <div className="col-span-2 flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-primary">
                <Timer className="size-4" />
                <span className="text-sm font-medium">Time saved: 14m 15s per run</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Integrations */}
      <section className="border-b border-border/60 bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight">Works with the tools you already use</h2>
            <p className="mt-3 text-muted-foreground">
              Ships with governed mock integrations so you can build and test full workflows today;
              bring your own OAuth app to connect Google Workspace, Microsoft 365, or Slack.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {integrations.map((i) => (
              <div key={i.label} className="flex flex-col items-center gap-2 rounded-lg border border-border/60 bg-background p-5 text-center">
                <i.icon className="size-5 text-primary" />
                <span className="text-xs font-medium">{i.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight">Simple pricing</h2>
            <p className="mt-3 text-muted-foreground">Start free. Upgrade when your team is running real workflows.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {pricingTiers.map((tier) => (
              <Card key={tier.name} className={tier.highlighted ? "border-primary shadow-sm" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    {tier.name}
                    {tier.highlighted && <Badge>Popular</Badge>}
                  </CardTitle>
                  <CardDescription>{tier.tagline}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-3xl font-semibold">{tier.price}<span className="text-sm font-normal text-muted-foreground">{tier.price !== "Custom" ? "/mo" : ""}</span></p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-primary" />{f}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-b border-border/60 bg-muted/30">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <h2 className="mb-8 text-3xl font-semibold tracking-tight">Frequently asked questions</h2>
          <div className="space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="group rounded-lg border border-border/60 bg-background p-4 open:pb-4">
                <summary className="cursor-pointer list-none font-medium">
                  {f.q}
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 py-24 text-center">
          <Workflow className="size-8 text-primary" />
          <h2 className="text-3xl font-semibold tracking-tight">Create your first automation</h2>
          <p className="max-w-xl text-muted-foreground">
            Sign up, describe a repetitive task, and watch the full plan → approve → execute → verify
            pipeline run end to end.
          </p>
          <Button size="lg" asChild>
            <Link href="/signup">Get started free <ArrowRight className="size-4" /></Link>
          </Button>
        </div>
      </section>
    </>
  );
}
