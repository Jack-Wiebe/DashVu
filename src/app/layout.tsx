import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import NavBar from "@/components/NavBar";
import { Toaster } from "@/components/ui/toaster";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { Button } from "@/components/ui/Button";

import { getServerSession } from "next-auth";
import SessionProvider from "@/components/SessionProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DashVu",
  description: "Your front page for the internet.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  return (
    <html lang="en" className={cn("bg-black antialiased", inter.className)}>
      <body className="min-h-screen pt-12 bg-slate-700 antialiased">
        <SessionProvider session={session}>
          <NavBar></NavBar>

          <div className="container max-w-screen-2xl h-full pt-12">
            {children}
          </div>

          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}

// const Auth = ({ session, status, Component, pageProps }) => {
//   return status === "loading" ? (
//     <span>Loading...</span>
//   ) : (
//     <>
//       {Component?.Roles &&
//       session?.user?.permissions.includes(Component?.Roles) ? (
//         <Component {...pageProps} />
//       ) : (
//         <Button>sign in</Button>
//       )}
//     </>
//   );
// };
