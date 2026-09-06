"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { updateProfile, type SettingsActionState } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const initialState: SettingsActionState = { error: null };

export function ProfileForm({ fullName }: { fullName: string }) {
  const [state, formAction, isPending] = useActionState(updateProfile, initialState);

  useEffect(() => {
    if (state.success) toast.success("Profile updated.");
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Card className="max-w-md">
      <CardHeader><CardTitle className="text-base">Your name</CardTitle></CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" name="full_name" defaultValue={fullName} />
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
