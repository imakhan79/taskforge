"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

const initialState: AuthActionState = { error: null };

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Sign in to your TaskForge organization.</CardDescription>
      </CardHeader>
      <CardContent>
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
