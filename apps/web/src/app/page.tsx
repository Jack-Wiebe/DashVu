import { redirect } from "next/navigation";
import { createCaller } from "@dashvu/api";

import { auth } from "@/auth";
import Dashboard from "@/components/Dashboard";

export default async function Home() {
  const session = await auth();
  if (!session) redirect("/sign-in");

  const caller = createCaller({ session: { user: session.user } });
  const dashboard = await caller.dashboard.getMine();

  return <Dashboard initialDashboard={dashboard} />;
}
