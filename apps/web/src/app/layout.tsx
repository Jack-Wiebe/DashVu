import type { Metadata } from "next";
import { createCaller, createContext } from "@dashvu/api";
import { cn } from "@/lib/utils";
import NavBar from "@/components/NavBar";
import { DashboardsProvider } from "@/components/DashboardsProvider";
import { Toaster } from "@/components/ui/toaster";
import { Inter } from "next/font/google";
import "@/styles/globals.css";

import { auth } from "@/auth";
import SessionProvider from "@/components/SessionProvider";
import { TRPCProvider } from "@/lib/trpc/client";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DashVu",
  description: "Your front page for the internet.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  const bootstrap = session
    ? await createCaller(createContext({ session: { user: session.user } })).dashboard.bootstrap()
    : null;

  return (
    <html lang="en" className={cn("bg-black antialiased", inter.className)}>
      <body className="min-h-screen pt-14 bg-slate-700 antialiased">
        <SessionProvider session={session}>
          <TRPCProvider>
            <DashboardsProvider initial={bootstrap}>
              <NavBar />

              <div className="container max-w-screen-2xl h-full">{children}</div>

              <Toaster />
            </DashboardsProvider>
          </TRPCProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
