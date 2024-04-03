"use client";
import Link from "next/link";
import { Icons } from "./Icons";
import { useSession } from "next-auth/react";
import UserAuthButton from "./UserAuthButton";

const NavBar = () => {
  const { data: session } = useSession();

  return (
    <div className="fixed top-0 inset-x-0 h-fit bg-zinc-700 border-b border-zinc-900 z-[10] py-2 text-slate-100">
      <div className="container mx-screen-2xl h-full mx-auto flex items-center justify-between gap-2">
        {/*logo*/}
        <Link href="/" className="flex gap-2 items-center">
          <Icons.logo className="h-8 w-8 sm:h-6 sm:w-6"></Icons.logo>
          <p className="hidden text-sm font-medium md:block">DashVu</p>
        </Link>

        <div className="text-xs md:text-base">
          {!session
            ? "Welcome to DashVu "
            : "Welcome back " + session?.user?.name}
        </div>
        {/* Search Bar */}

        <UserAuthButton />
      </div>
    </div>
  );
};

export default NavBar;
