import React, { useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";

import SpotifyWebApi from "spotify-web-api-node";

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.NEXT_PUBLIC_CLIENT_ID,
  clientSecret: process.env.NEXT_PUBLIC_CLIENT_SECRET,
});

function useSpotify() {
  const { toast } = useToast();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") {
      toast({
        title: "Loading Track Data",
        description: "...",
      });
    }

    if (session?.user.accessToken) {
      spotifyApi.setAccessToken(session?.user.accessToken);
      toast({
        title: "Token Granted",
        description: session.user.accessToken,
      });
    }
  }, [session]);

  return spotifyApi;
}

export default useSpotify;
