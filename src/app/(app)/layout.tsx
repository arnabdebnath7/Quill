import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <AppShell user={user}>{children}</AppShell>;
}
