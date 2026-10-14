import "server-only";
import type { Connector } from "@dashvu/core";
import type { ConnectorId } from "@dashvu/validators";

import { googleConnector } from "./google";
import { openMeteoConnector } from "./openMeteo";
import { openMeteoGeocodingConnector } from "./openMeteoGeocoding";
import { rainViewerConnector } from "./rainViewer";
import { spotifyConnector } from "./spotify";

export const CONNECTORS = {
  spotify: spotifyConnector,
  google: googleConnector,
  openMeteo: openMeteoConnector,
  openMeteoGeocoding: openMeteoGeocodingConnector,
  rainViewer: rainViewerConnector,
} satisfies Record<ConnectorId, Connector>;

export function getConnector<K extends ConnectorId>(id: K): (typeof CONNECTORS)[K] {
  return CONNECTORS[id];
}
