"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateMemberRole } from "@/lib/actions/settings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OrgRole } from "@/types/database";

const ROLES: OrgRole[] = ["owner", "admin", "manager", "member", "viewer"];

export function MemberRoleSelect({ memberId, role, disabled }: { memberId: string; role: OrgRole; disabled: boolean }) {
  const [isPending, startTransition] = useTransition();

  function onChange(value: string) {
    const formData = new FormData();
    formData.set("member_id", memberId);
    formData.set("role", value);
    startTransition(async () => {
      const result = await updateMemberRole(formData);
      if (result.error) toast.error(result.error);
      else toast.success("Role updated.");
    });
  }

  return (
    <Select defaultValue={role} onValueChange={onChange} disabled={disabled || isPending}>
      <SelectTrigger className="w-32 capitalize"><SelectValue /></SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
