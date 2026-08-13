import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <AppShell userName={session.user.name ?? session.user.email ?? "User"} role={session.user.role}>
      <div className="mx-auto w-full max-w-7xl">{children}</div>
    </AppShell>
  );
}
