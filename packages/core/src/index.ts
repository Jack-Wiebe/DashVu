/**
 * Framework-agnostic business logic (pure functions only).
 *
 * Pure helpers such as `apps/web/src/lib/filters.ts` will move here so they can
 * be unit tested without React/Next dependencies.
 */
export const CORE_PACKAGE = "@dashvu/core";

export type { AuthKind, RatePolicy, ConnectorDefinition, Connector } from "./connector";

export { describeWeatherCode } from "./weather";
export { formatRelativeTime } from "./news";
export type { NewsItem } from "./news";
export { dailyIndex, utcDayNumber, utcDateKey } from "./discover";
export type { Artwork, SpaceImage } from "./discover";
export { WORD_OF_THE_DAY, stripHtml } from "./dictionary";
export type {
  DictionaryEntry,
  DictionaryMeaning,
  DictionaryDefinition,
  RelatedWord,
  RelatedRelation,
} from "./dictionary";
export { haversineMeters, decodePolyline, formatDuration, formatDistance } from "./maps";
export type {
  TravelMode,
  GeoPoint,
  GeoPlace,
  RouteLeg,
  RouteResult,
  TransitLeg,
  TransitItinerary,
  RoutingRequest,
} from "./maps";
