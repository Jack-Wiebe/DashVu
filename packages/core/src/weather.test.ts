import { describe, expect, it } from "vitest";

import { describeWeatherCode } from "./weather";

describe("describeWeatherCode", () => {
  it("returns labels for known codes", () => {
    expect(describeWeatherCode(0)).toBe("Clear sky");
    expect(describeWeatherCode(45)).toBe("Fog");
    expect(describeWeatherCode(63)).toBe("Moderate rain");
    expect(describeWeatherCode(95)).toBe("Thunderstorm");
    expect(describeWeatherCode(99)).toBe("Thunderstorm with heavy hail");
  });

  it("returns Unknown for null, undefined, and unrecognized codes", () => {
    expect(describeWeatherCode(null)).toBe("Unknown");
    expect(describeWeatherCode(undefined)).toBe("Unknown");
    expect(describeWeatherCode(42)).toBe("Unknown");
    expect(describeWeatherCode(-1)).toBe("Unknown");
  });
});
