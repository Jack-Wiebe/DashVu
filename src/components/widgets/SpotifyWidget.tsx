import React, { useEffect, useState } from "react";
import * as Progress from "@radix-ui/react-progress";
import { useSession } from "next-auth/react";
import {
  ChevronFirst,
  Play,
  Pause,
  ChevronLast,
  Shuffle,
  Repeat2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import WidgetProps from "@/types/widget";
import { Button } from "../ui/Button";
import { spotifyApi } from "../../lib/spotify";

const SpotifyWidget: React.FC<WidgetProps> = ({ props, className }) => {
  const { data: session, status: status } = useSession();
  let [isPlaying, setIsPlaying] = useState<boolean>();
  let [trackData, setTrackData] = useState<any>();
  let [playlistData, setPlaylistData] = useState<any>();
  let [progress, SetProgress] = useState<number>(0);
  const { toast } = useToast();

  let updateCB: NodeJS.Timeout;
  let progressCB: NodeJS.Timeout;

  useEffect(() => {
    console.log("User Session:", session);

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
      spotifyApi.getMyCurrentPlaybackState().then((res) => {
        console.log("Initial Playback State:", res);
        if (res.body) {
          initTrackData();
        } else {
          //If no device is currently active, transfer playback
          spotifyApi.getMyDevices().then(
            (res) => {
              let availableDevices = res.body.devices;
              console.log("Use Effect availible devices: ", availableDevices);
              if (availableDevices) {
                spotifyApi
                  .transferMyPlayback([availableDevices[0].id!])
                  .then((res) => {
                    console.log("Use Effect Transfer Playback: ", res);
                    initTrackData();
                  });
              } else {
                toast({
                  title: "No Devices found",
                  description: "There we no active devices found",
                });
              }
            },
            function (err) {
              console.log("Something went wrong!", err);
            }
          );
        }
      });
    }
  }, [status, session]);

  useEffect(() => {
    console.log("Update Play State in Effect");
  }, [isPlaying]);

  useEffect(() => {
    console.log("Update Track Data in Effect");
  }, [trackData]);

  const updateProgress = () => {
    spotifyApi.getMyCurrentPlaybackState().then((state) => {
      if (state.body.progress_ms && state.body.item?.duration_ms) {
        const percent =
          (state.body.progress_ms / state.body.item.duration_ms) * 100;
        console.log("Percent: " + percent);

        SetProgress(percent);

        //setUpdateTimeout(state.body.item?.duration_ms - state.body.progress_ms);
        //setProgressInterval((percent * state.body.item?.duration_ms) / 100);
      }
    });
  };

  const setProgressInterval = (interval: number) => {
    if (progressCB) {
      clearTimeout(progressCB);
    }

    progressCB = setInterval(() => {
      console.log("update");
      //if (progress) SetProgress(progress + 1);
    }, interval);
  };

  const setUpdateTimeout = function (remaining_ms: number) {
    if (updateCB) {
      clearTimeout(updateCB);
    }
    updateCB = setTimeout(() => {
      console.log("Auto Update Next Track Data");
      initTrackData();
    }, remaining_ms);
  };

  const initTrackData = () => {
    spotifyApi.getMyCurrentPlayingTrack().then((res) => {
      console.log("Use Effect Current Track: ", res);
      setIsPlaying(res.body.is_playing); //Initial set of Is Playing
      updateTrackData(res.body.item);
      updatePlaylist();
      updateProgress();
    });
  };

  const updateTrackData = (
    track: SpotifyApi.TrackObjectFull | SpotifyApi.EpisodeObject | null
  ) => {
    if (!track) {
      toast({
        title: "Error Passing Track Data to Upadate",
        description: "No current track found",
      });
    }
    console.log("current track is: " + track?.name);
    setTrackData(track);
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
        console.log("Something went wrong!", err);
      }
    );
  };

  const updatePlaylist = function () {
    spotifyApi.getMyCurrentPlayingTrack().then((res) => {
      const ID = res?.body?.context?.uri.split(":").pop();
      const type = res?.body?.context?.uri.split(":").slice(-2)[0];
      if (ID == null) {
        console.error("no current playlist");
        return;
      }
      console.log("playlist ID: " + ID);

      if (type == "album") {
        spotifyApi.getAlbum(ID).then((res) => {
          console.log("Album:", res);
          setPlaylistData(res.body);
        });
      } else if (type == "playlist") {
        spotifyApi.getPlaylist(ID).then((res) => {
          console.log("Playlist:", res);
          setPlaylistData(res.body);
        });
      }
    });
  };

  const handleClickPlay = () => {
    spotifyApi.getMyCurrentPlayingTrack().then(
      (res) => {
        console.log("Toggle Play: ", res);
        if (res.body?.is_playing) {
          spotifyApi.pause();
          console.log("Playback Stopped");
          setIsPlaying(false);
        } else {
          spotifyApi.play();
          console.log("Playback started");
          setIsPlaying(true);
        }
        updateTrackData(res.body?.item);
        updateProgress();
      },
      function (err) {
        console.log("Something went wrong!", err);
      }
    );
  };

  const handleClickNext = async () => {
    if (isPlaying) {
      spotifyApi.skipToNext().then(() => {
        console.log("Skipped to next track");
        setTimeout(() => {
          spotifyApi.getMyCurrentPlayingTrack().then((res) => {
            console.log("Post skip update");
            updateTrackData(res.body.item);
            updateProgress();
          });
        }, 500);
      });
    }
  };

  const handleClickPrevious = () => {
    if (isPlaying) {
      spotifyApi.skipToPrevious().then(() => {
        console.log("Skipped to previous track");
        setTimeout(() => {
          spotifyApi.getMyCurrentPlayingTrack().then((res) => {
            console.log("Post skip update");
            updateTrackData(res.body.item);
            updateProgress();
          });
        }, 500);
      });
    }
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
    //spotifyApi.getQueue();
    //console.log(trackData.album.images[1].url);
    updateProgress();
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
          "grid items-center grid-cols-1 grid-rows-5 text-sm gap-8"
        )}
      >
        <div
          id="User Info"
          className="flex gap-2 items-center h-10 grid-rows-2 overflow-clip"
        >
          <img
            className="flex-1 h-10 w-10 max-w-10"
            src={session?.user.image!}
          />
          <div className="flex-1">{session?.user.name}</div>
          <div>{playlistData?.name}</div>
        </div>

        <div id="Album Cover" className="flex justify-center row-span-2">
          <img className="w-40" src={trackData?.album?.images[1]?.url} />
        </div>

        <div
          id="Track Info"
          className="flex flex-col items-center justify-evenly gap-2 text-center"
        >
          <p>{trackData?.name ?? trackData?.name}</p>
          <p className="text-xs">
            {trackData?.artists.map((a: any, i: number, artists: any) => {
              return a.name + (i + 1 < artists.length ? ", " : "");
            })}
          </p>

          <Progress.Root
            value={progress}
            className="w-10/12 h-2 overflow-hidden bg-black rounded-full mt-1"
          >
            <Progress.Indicator
              className="bg-white w-full h-full"
              style={{
                transform: `translateX(-${100 - progress}%)`,
              }}
            />
          </Progress.Root>
        </div>

        <div
          id="buttons"
          className="flex items-center justify-evenly lg:gap-2 sm:gap-0"
        >
          <Button
            className="sm:max-w-12"
            onClick={() => {} /*handleClickShuffle*/}
          >
            <Shuffle />
          </Button>
          <Button className="sm:max-w-12" onClick={handleClickPrevious}>
            <ChevronFirst />
          </Button>

          <Button className="sm:max-w-12" onClick={handleClickPlay}>
            {isPlaying ? <Pause /> : <Play />}
          </Button>

          <Button className="sm:max-w-12" onClick={handleClickNext}>
            <ChevronLast />
          </Button>

          <Button
            className="sm:max-w-12"
            onClick={() => {} /*handleClickRepeat*/}
          >
            <Repeat2 />
          </Button>
        </div>

        {/* <div className="flex items-center justify-evenly gap-2">
          <Button onClick={debug}>init</Button>
          <Button onClick={debug1}>get device</Button>
          <Button onClick={debug2}>get track</Button>
        </div> */}
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
