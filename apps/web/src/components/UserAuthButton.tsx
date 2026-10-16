"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./ui/Button";

const AuthButton = () => {
  const { data: session } = useSession();

  if (session) return null;

  return (
    <Link href="/sign-in" className={cn(buttonVariants())}>
      Sign In
    </Link>
  );
};

export default AuthButton;
