import "server-only";
import type { Connector, ConnectorDefinition, RatePolicy } from "@dashvu/core";

import { fetchCached } from "../cache";
import { fetchWithRetry } from "../http";
import { rateLimit } from "../ratelimit";

export interface OpenMeteoRequest {
  latitude: number;
  longitude: number;
}

export interface CurrentWeather {
  temperatureC: number | null;
  windSpeedKph: number | null;
  weatherCode: number | null;
  observedAt: string;
}

export interface DailyForecast {
  date: string;
  weatherCode: number | null;
  tempMaxC: number | null;
  tempMinC: number | null;
  precipitationProbability: number | null;
  windMaxKph: number | null;
  sunrise: string | null;
  sunset: string | null;
}

export interface OpenMeteoResponse {
  current: CurrentWeather;
  daily: DailyForecast[];
}

const policy: RatePolicy = { points: 60, windowMs: 60 * 1000 };

const definition: ConnectorDefinition = {
  id: "openMeteo",
  authKind: "keyless",
  capabilities: ["currentWeather", "dailyForecast"],
  cacheTtlMs: 10 * 60 * 1000,
  ratePolicy: policy,
};

interface OpenMeteoPayload {
  current?: {
    temperature_2m?: number;
    wind_speed_10m?: number;
    weather_code?: number;
    time?: string;
  };
  daily?: {
    time?: string[];
    weather_code?: Array<number | null>;
    temperature_2m_max?: Array<number | null>;
    temperature_2m_min?: Array<number | null>;
    precipitation_probability_max?: Array<number | null>;
    wind_speed_10m_max?: Array<number | null>;
    sunrise?: Array<string | null>;
    sunset?: Array<string | null>;
  };
}

function toDailyForecast(payload: OpenMeteoPayload): DailyForecast[] {
  const daily = payload.daily;
  const dates = daily?.time ?? [];

  return dates.map((date, index) => ({
    date,
    weatherCode: daily?.weather_code?.[index] ?? null,
    tempMaxC: daily?.temperature_2m_max?.[index] ?? null,
    tempMinC: daily?.temperature_2m_min?.[index] ?? null,
    precipitationProbability: daily?.precipitation_probability_max?.[index] ?? null,
    windMaxKph: daily?.wind_speed_10m_max?.[index] ?? null,
    sunrise: daily?.sunrise?.[index] ?? null,
    sunset: daily?.sunset?.[index] ?? null,
  }));
}

export const openMeteoConnector: Connector<OpenMeteoRequest, OpenMeteoResponse> = {
  definition,
  async invoke(_userId, { latitude, longitude }) {
    rateLimit(policy, "openMeteo");

    return fetchCached(cacheKey(latitude, longitude), definition.cacheTtlMs, async () => {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", String(latitude));
      url.searchParams.set("longitude", String(longitude));
      url.searchParams.set("current", "temperature_2m,wind_speed_10m,weather_code");
      url.searchParams.set(
        "daily",
        "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset"
      );
      url.searchParams.set("forecast_days", "7");
      url.searchParams.set("timezone", "auto");

      const response = await fetchWithRetry(url);
      if (!response.ok) {
        throw new Error(`Open-Meteo request failed (${response.status})`);
      }

      const data = (await response.json()) as OpenMeteoPayload;
      const current = data.current ?? {};

      return {
        current: {
          temperatureC: current.temperature_2m ?? null,
          windSpeedKph: current.wind_speed_10m ?? null,
          weatherCode: current.weather_code ?? null,
          observedAt: current.time ?? new Date().toISOString(),
        },
        daily: toDailyForecast(data),
      };
    });
  },
};

function cacheKey(latitude: number, longitude: number): string {
  return `openMeteo:${latitude}:${longitude}`;
}
