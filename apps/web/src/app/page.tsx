import { redirect } from "next/navigation";
import { createCaller, createContext } from "@dashvu/api";

import { auth } from "@/auth";
import Dashboard from "@/components/Dashboard";

export default async function Home() {
  const session = await auth();
  if (!session) redirect("/sign-in");

  const caller = createCaller(createContext({ session: { user: session.user } }));
  const dashboard = await caller.dashboard.getMine();

  return <Dashboard initialDashboard={dashboard} />;
}
