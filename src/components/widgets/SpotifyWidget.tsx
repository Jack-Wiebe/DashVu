import React, { useEffect, useState } from "react";
import WidgetProps from "@/types/widget";
import { Button, buttonVariants } from "../ui/Button";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";
import { ChevronFirst, Play, Pause, ChevronLast } from "lucide-react";
import { spotifyApi } from "../../lib/spotify";

const SpotifyWidget: React.FC<WidgetProps> = ({ props, className }) => {
  const { data: session, status: status } = useSession();
  let [isPlaying, setIsPlaying] = useState<boolean>();
  let [currentPlaylist, setCurrentPlaylist] = useState<string>();
  let [trackData, setTrackData] = useState<any>();
  let [playlistData, setPlaylistData] = useState<any>();
  const { toast } = useToast();

  let updateCB: NodeJS.Timeout;

  useEffect(() => {
    console.log(session);

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
      spotifyApi.getMyDevices().then(
        (res) => {
          let availableDevices = res.body.devices;
          console.log("Use Effect availible devices: ", availableDevices);
          if (availableDevices) {
            spotifyApi
              .transferMyPlayback([availableDevices[0].id!])
              .then((res) => {
                console.log("Use Effect Transfer Playback: ", res);
                spotifyApi.getMyCurrentPlayingTrack().then((res) => {
                  console.log("Use Effect Current Track: ", res);
                  setIsPlaying(res.body.is_playing); //Initial set of Is Playing

                  updateTrackData(res.body.item);
                  updatePlaylist();
                });
                //TODO comment this use effect promise chain and continue dev here with finding last played song on device
              });
          } else {
            toast({
              title: "No Devices found",
              description: "There we no active devices found",
            });
          }

          toast({
            title: "Session Info",
            description: availableDevices.map((device) => {
              return device.name;
            }),
          });
        },
        function (err) {
          //if the user making the request is non-premium, a 403 FORBIDDEN response code will be returned
          console.log("Something went wrong!", err);
        }
      );
    }
  }, [status, session]);

  useEffect(() => {
    console.log("Update Play State");
  }, [isPlaying, spotifyApi, session]);

  const updateTrackData = (
    track: SpotifyApi.TrackObjectFull | SpotifyApi.EpisodeObject | null
  ) => {
    if (!track) {
      toast({
        title: "Error Passing Track Data to Upadate",
        description: "No current track found",
      });
    }
    setTrackData(track);

    spotifyApi.getMyCurrentPlayingTrack().then((res) => {
      console.log("Update Track Data: ", res);
      const track = res.body;
      //setIsPlaying(track.is_playing);
      setTrackData(track.item);
      if (track.item && track.is_playing) {
        // const remaining_ms = track.timestamp - (track.progress_ms ?? 0); //TODO: confirm this actually works, create timeout for updating song
        // console.log(remaining_ms);
        // setUpdateTimeout(remaining_ms);
      } else if (track.item) {
      } else {
        toast({
          title: "Could not find Track",
          description: "No current track found",
        });
      }
    });
  };

  const setUpdateTimeout = function (remaining_ms: number) {
    if (updateCB) {
      clearTimeout(updateCB);
    }
    updateCB = setTimeout(() => {
      console.log("Auto Update Next Track Data");
      //updateTrackData();
    }, remaining_ms);
  };

  const updateDeviceName = function () {
    spotifyApi.getMyDevices().then(
      (res) => {
        let availableDevices = res.body.devices;
        if (availableDevices) {
          spotifyApi.transferMyPlayback([availableDevices[0].id!]);
        } else {
          console.log(availableDevices);
          toast({
            title: "No Devices found",
            description: "There we no active devices found",
          });
        }
        console.log(availableDevices);
        toast({
          title: "Availible Devices",
          description: availableDevices.reduce((previous, device, index) => {
            return (
              `${(previous += device.name)}` +
              (index >= availableDevices.length - 1 ? "" : ", ")
            );
          }, ""),
        });
      },
      function (err) {
        //if the user making the request is non-premium, a 403 FORBIDDEN response code will be returned
        console.log("Something went wrong!", err);
      }
    );
  };

  const updatePlaylist = function () {
    spotifyApi.getMyCurrentPlayingTrack().then((res) => {
      let playlistID = res?.body?.context?.uri.split(":").pop();
      if (playlistID == null) {
        console.error("no current playlist");
        playlistID = "";
      }
      console.log("playlist ID: " + playlistID);
      spotifyApi.getPlaylist(playlistID).then((res) => {
        console.log("playlist: ");
        console.log(res);
        setPlaylistData(res.body);
      });
    });
    //

    //
  };

  const handleClickPlay = () => {
    spotifyApi.getMyCurrentPlayingTrack().then((res) => {
      console.log("Toggle Play: ", res);
      //setTrackData(res.body.item);
      //setIsPlaying(!res.body.is_playing); //update UI before promise is returned, should update once track is updated

      if (res.body?.is_playing) {
        spotifyApi.pause();
        console.log("Playback Stopped");
        setIsPlaying(false);
        updateTrackData(res.body?.item);
      } else {
        spotifyApi.play();
        console.log("Playback started");
        setIsPlaying(true);
        updateTrackData(res.body?.item);
      }
    });
  };

  const handleClickNext = () => {
    if (isPlaying) {
      spotifyApi.skipToNext().then(() => {
        console.log("Skipped to next track");
        spotifyApi.getMyCurrentPlayingTrack().then((res) => {
          console.log("Post skip update");
          updateTrackData(res.body.item);
        });
      });
    }

    // spotifyApi.getMyCurrentPlayingTrack().then((res) => {
    //   console.log(res);

    //   //setTrackData(res.body.item);

    //   if (res.body?.is_playing) {
    //     spotifyApi.skipToNext().then(
    //       () => {
    //         console.log("Skipped to next track");
    //         //updateTrackData();
    //       },
    //       (err) => {
    //         //if the user making the request is non-premium, a 403 FORBIDDEN response code will be returned
    //         console.log("Something went wrong!", err);
    //       }
    //     );
    //   }
    // });
  };

  const handleClickPrevious = () => {
    if (isPlaying) {
      spotifyApi.skipToPrevious().then(() => {
        console.log("Skipped to previous track");
        spotifyApi.getMyCurrentPlayingTrack().then((res) => {
          console.log("Post skip update");
          updateTrackData(res.body.item);
        });
      });
    }

    // spotifyApi.getMyCurrentPlayingTrack().then((res) => {
    //   console.log(res);

    //   //setTrackData(res.body.item);

    //   if (res.body?.is_playing) {
    //     spotifyApi.skipToPrevious().then(
    //       () => {
    //         console.log("Playback Stopped");
    //         updateTrackData();
    //       },
    //       (err) => {
    //         //if the user making the request is non-premium, a 403 FORBIDDEN response code will be returned
    //         console.log("Something went wrong!", err);
    //       }
    //     );
    //   }
    // });
  };

  const debug2 = () => {
    spotifyApi.getMyCurrentPlayingTrack().then((res) => {
      console.log(res);
      if (res.body.item) setTrackData(res.body.item);
      else {
        toast({
          title: "Could not find Track",
          description: "No current track found",
        });
      }
    });
  };

  const debug1 = () => {
    //updateDeviceName();
    //updatePlaylist();
    console.log(trackData.artists[0].name);
  };

  const debug = () => {
    console.log(session);
    if (session?.user.accessToken && session?.user.refreshToken) {
      spotifyApi.setAccessToken(session?.user.accessToken);
      spotifyApi.getMe().then((res) => {
        console.log(res);
      });

      spotifyApi.getMyCurrentPlayingTrack().then((res) => {
        res.body?.is_playing
          ? setIsPlaying(res.body.is_playing)
          : setIsPlaying(false);
      });

      toast({
        title: "Session Info",
        description: session?.user.refreshToken,
      });
    } else {
      toast({
        title: "Not Signed Into Spotify",
        description: "Use Sign In button to sign-in to Spotify",
      });
    }
  };

  if (session?.user.refreshToken) {
    return (
      <div
        className={cn(
          className,
          "grid items-center grid-cols-1 grid-rows-4 gap-4"
        )}
      >
        <div className="flex items-center h-10 grid-rows-2">
          <img
            className="flex-1 h-10 w-10 max-w-10"
            src={session?.user.image!}
          />
          <div className="flex-1">{session?.user.name}</div>
          <div>{playlistData?.name}</div>
        </div>
        <div className="flex items-center justify-evenly gap-2">
          <Button onClick={debug}>init</Button>
          <Button onClick={debug1}>get device</Button>
          <Button onClick={debug2}>get track</Button>
        </div>
        <div className="flex flex-col items-center justify-evenly gap-2">
          <p>{trackData?.name ?? trackData?.name}</p>
          <p>
            {trackData?.artists.map((a: any, i: number, artists: any) => {
              return a.name + (i + 1 < artists.length ? ", " : "");
            })}
          </p>
        </div>
        <div className="flex items-center justify-evenly gap-2">
          <Button onClick={handleClickPrevious}>
            <ChevronFirst />
          </Button>

          <Button onClick={handleClickPlay}>
            {isPlaying ? <Pause /> : <Play />}
          </Button>

          <Button onClick={handleClickNext}>
            <ChevronLast />
          </Button>
        </div>
      </div>
    );
  } else {
    return (
      <div className={cn(className, "flex items-center justify-evenly gap-4")}>
        <Button onClick={debug}>debug spotify</Button>
      </div>
    );
  }
};

export default SpotifyWidget;
