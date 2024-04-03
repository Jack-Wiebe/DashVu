"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "./ui/Button";
import React from "react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./ui/Button";

const AuthButton = () => {
  const { data: session } = useSession();

  const logout = async () => {
    try {
      console.log("Start");
      await signOut();
    } catch (e) {
      console.log(e);
    }
  };

  if (!session)
    return (
      <Link href="/sign-in" className={cn(buttonVariants(), "")}>
        Sign In
      </Link>
    );
  else
    return (
      <Button onClick={logout} size="sm" className={cn(buttonVariants(), "")}>
        Sign Out
      </Button>
    );
};

export default AuthButton;
