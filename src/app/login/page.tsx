import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginClient } from "./login-client";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/today");
  return <LoginClient />;
}
