"use client";

import { useActionState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { login, loginAsDemo, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Loader2, Sparkles } from "lucide-react";

const initialState: AuthActionState = { error: null };

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, isPending] = useActionState(login, initialState);
  const [isDemoPending, startDemoTransition] = useTransition();

  function tryDemo() {
    startDemoTransition(async () => {
      const result = await loginAsDemo();
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Sign in to your TaskForge organization.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" variant="outline" className="w-full" onClick={tryDemo} disabled={isDemoPending || isPending}>
          {isDemoPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Try the live demo
        </Button>
        <div className="my-4 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or sign in</span>
          <Separator className="flex-1" />
        </div>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="next" value={next ?? "/dashboard"} />
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@company.com" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
                Forgot password?
              </Link>
            </div>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Sign in
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-foreground hover:underline">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
