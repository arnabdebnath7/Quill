import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { SettingsClient } from "./settings-client";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <SettingsClient user={user} />;
}
