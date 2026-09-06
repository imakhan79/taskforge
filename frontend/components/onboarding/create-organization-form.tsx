"use client";

import { useActionState } from "react";
import { createOrganization, type OrgActionState } from "@/lib/actions/organizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

const initialState: OrgActionState = { error: null };

export function CreateOrganizationForm() {
  const [state, formAction, isPending] = useActionState(createOrganization, initialState);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create your organization</CardTitle>
        <CardDescription>
          You&apos;ll be its owner, and can invite teammates once you&apos;re in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization name</Label>
            <Input id="name" name="name" required autoFocus placeholder="Acme Inc." />
          </div>
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Create organization
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
