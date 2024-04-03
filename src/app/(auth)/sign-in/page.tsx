import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import SignIn from "@/components/SignIn";
import { FC } from "react";

const page: FC = () => {
  return (
    <div className="absolute inset-0">
      <div className="text-slate-100 h-full max-w-2xl mx-auto flex flex-col items-center justify-center gap-20">
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "self-start -mt-20"
          )}
        >
          Home
        </Link>

        <SignIn></SignIn>
      </div>
    </div>
  );
};

export default page;
