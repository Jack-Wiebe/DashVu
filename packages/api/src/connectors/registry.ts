import "server-only";
import type { Connector } from "@dashvu/core";
import type { ConnectorId } from "@dashvu/validators";

import { googleConnector } from "./google";
import { icanhazdadjokeConnector } from "./icanhazdadjoke";
import { openMeteoConnector } from "./openMeteo";
import { openMeteoGeocodingConnector } from "./openMeteoGeocoding";
import { rainViewerConnector } from "./rainViewer";
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
} satisfies Record<ConnectorId, Connector>;

export function getConnector<K extends ConnectorId>(id: K): (typeof CONNECTORS)[K] {
  return CONNECTORS[id];
}
