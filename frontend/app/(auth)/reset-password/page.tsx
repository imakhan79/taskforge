import type { Metadata } from "next";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export const metadata: Metadata = { title: "Set new password" };

export default function ResetPasswordPage() {
  return <UpdatePasswordForm />;
}
