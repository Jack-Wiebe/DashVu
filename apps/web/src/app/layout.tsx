import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import NavBar from "@/components/NavBar";
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

  return (
    <html lang="en" className={cn("bg-black antialiased", inter.className)}>
      <body className="min-h-screen pt-12 bg-slate-700 antialiased">
        <SessionProvider session={session}>
          <TRPCProvider>
            <NavBar />

            <div className="container max-w-screen-2xl h-full">{children}</div>

            <Toaster />
          </TRPCProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
