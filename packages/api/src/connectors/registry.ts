import "server-only";
import type { Connector } from "@dashvu/core";
import type { ConnectorId } from "@dashvu/validators";

import { alJazeeraConnector } from "./alJazeera";
import { allsidesConnector } from "./allsides";
import { bbcNewsConnector } from "./bbcNews";
import { clevelandConnector } from "./cleveland";
import { googleConnector } from "./google";
import { hackerNewsConnector } from "./hackerNews";
import { icanhazdadjokeConnector } from "./icanhazdadjoke";
import { nasaImagesConnector } from "./nasaImages";
import { openMeteoConnector } from "./openMeteo";
import { openMeteoGeocodingConnector } from "./openMeteoGeocoding";
import { rainViewerConnector } from "./rainViewer";
import { spaceflightNewsConnector } from "./spaceflightNews";
import { spotifyConnector } from "./spotify";
import { uselessFactsConnector } from "./uselessFacts";
import { wikimediaOnThisDayConnector } from "./wikimediaOnThisDay";
import { zenQuotesConnector } from "./zenQuotes";

export const CONNECTORS = {
  spotify: spotifyConnector,
  google: googleConnector,
  openMeteo: openMeteoConnector,
  openMeteoGeocoding: openMeteoGeocodingConnector,
  rainViewer: rainViewerConnector,
  zenQuotes: zenQuotesConnector,
  icanhazdadjoke: icanhazdadjokeConnector,
  uselessFacts: uselessFactsConnector,
  wikimediaOnThisDay: wikimediaOnThisDayConnector,
  hackerNews: hackerNewsConnector,
  spaceflightNews: spaceflightNewsConnector,
  alJazeera: alJazeeraConnector,
  allsides: allsidesConnector,
  bbcNews: bbcNewsConnector,
  cleveland: clevelandConnector,
  nasaImages: nasaImagesConnector,
} satisfies Record<ConnectorId, Connector>;

export function getConnector<K extends ConnectorId>(id: K): (typeof CONNECTORS)[K] {
  return CONNECTORS[id];
}
