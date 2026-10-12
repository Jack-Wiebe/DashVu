"use client";

import React, { FC, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/Button";
import { signIn, useSession } from "next-auth/react";
import { Icons } from "./Icons";
import { useToast } from "@/hooks/use-toast";

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

const UserAuthForm: FC<UserAuthFormProps> = ({ className, ...props }) => {
  const { data: session } = useSession();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const loginWithGoogle = async () => {
    setIsLoading(true);

    try {
      await signIn("google", { callbackUrl: "/" });
    } catch (e) {
      console.log(e);
      toast({
        title: "Google Authentication Failure",
        description: "Could not sign in using Google",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithSpotify = async () => {
    setIsLoading(true);

    try {
      await signIn("spotify", { callbackUrl: "/" });
    } catch (e) {
      console.log(e);
      toast({
        title: "Spotify Authentication Failure",
        description: "Could not sign in using Spotify",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (session) {
    return <div>Welcome back to DashVu</div>;
  } else {
    return (
      <div className={cn("flex w-full flex-col gap-2", className)} {...props}>
        <Button onClick={loginWithGoogle} isLoading={isLoading} size="sm" className="w-full">
          {isLoading ? null : <Icons.google className="h-4 w-4 mr-2"></Icons.google>}
          Google
        </Button>
        <Button onClick={loginWithSpotify} isLoading={isLoading} size="sm" className="w-full">
          {isLoading ? null : <Icons.spotify className="h-4 w-4 mr-2"></Icons.spotify>}
          Spotify
        </Button>
      </div>
    );
  }
};

export default UserAuthForm;
