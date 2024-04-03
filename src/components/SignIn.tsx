import React from "react";
import Link from "next/link";
import { Icons } from "./Icons";
import UserAuthForm from "./UserAuthForm";

const SignIn = () => {
  return (
    <div className="container mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
      <div className="flex flex-col space-y-2 text-center items-center">
        <Icons.logo className="mx-auto h-6 w-6" />
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome To DashVu
        </h1>
        <p className="text-sm max-w-xs mx-auto">
          by continuing you agree to our User Agreement and Privacy Policy
        </p>

        {/* sign-in form */}
        <UserAuthForm />

        <p className="px-8 text-center text-sm text-zinc-100">
          New to DashVu?{" "}
          <Link
            href="/sign-up"
            className="hover:text-zinc-100 text-sm underline underline-offset-4"
          >
            Sign-up here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignIn;
