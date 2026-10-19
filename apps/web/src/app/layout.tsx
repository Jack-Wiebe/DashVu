import type { Metadata } from "next";
import { createCaller, createContext } from "@dashvu/api";
import { cn } from "@/lib/utils";
import { DEFAULT_THEME, themeClassName } from "@/lib/themes";
import NavBar from "@/components/NavBar";
import { DashboardsProvider } from "@/components/DashboardsProvider";
import { PreferencesProvider } from "@/components/PreferencesProvider";
import { SettingsProvider } from "@/components/SettingsDrawer";
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
  const caller = session ? createCaller(createContext({ session: { user: session.user } })) : null;

  const bootstrap = caller ? await caller.dashboard.bootstrap() : null;
  const preferences = caller ? await caller.user.getPreferences() : null;
  const theme = preferences?.theme ?? DEFAULT_THEME;

  return (
    <html lang="en" className={cn(themeClassName(theme), "antialiased", inter.className)}>
      <body
        suppressHydrationWarning
        className="min-h-screen pt-14 bg-background text-foreground antialiased"
      >
        <SessionProvider session={session}>
          <TRPCProvider>
            <PreferencesProvider
              initialTheme={theme}
              initialSettings={preferences?.settings ?? null}
            >
              <DashboardsProvider initial={bootstrap}>
                <SettingsProvider>
                  <NavBar />

                  <div className="container max-w-screen-2xl h-full">{children}</div>

                  <Toaster />
                </SettingsProvider>
              </DashboardsProvider>
            </PreferencesProvider>
          </TRPCProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
