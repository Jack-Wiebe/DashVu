import { describe, expect, it } from "vitest";

import {
  decodePolyline,
  formatDistance,
  formatDuration,
  haversineMeters,
  nearestNeighborOrder,
} from "./maps";

describe("haversineMeters", () => {
  it("returns 0 for identical points", () => {
    expect(haversineMeters({ lat: 48.85, lon: 2.35 }, { lat: 48.85, lon: 2.35 })).toBe(0);
  });

  it("matches one degree of latitude", () => {
    const oneDegree = haversineMeters({ lat: 0, lon: 0 }, { lat: 1, lon: 0 });
    expect(oneDegree).toBeCloseTo((Math.PI / 180) * 6_371_008.8, 3);
  });

  it("approximates the Paris–London distance", () => {
    const paris = { lat: 48.8566, lon: 2.3522 };
    const london = { lat: 51.5074, lon: -0.1278 };
    const distance = haversineMeters(paris, london);
    expect(distance).toBeGreaterThan(340_000);
    expect(distance).toBeLessThan(348_000);
  });

  it("is symmetric", () => {
    const a = { lat: 48.8566, lon: 2.3522 };
    const b = { lat: 51.5074, lon: -0.1278 };
    expect(haversineMeters(a, b)).toBe(haversineMeters(b, a));
  });
});

describe("decodePolyline", () => {
  it("decodes the canonical Google example (precision 5)", () => {
    const encoded = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";
    const points = decodePolyline(encoded);
    expect(points).toHaveLength(3);
    expect(points[0].lat).toBeCloseTo(38.5, 5);
    expect(points[0].lon).toBeCloseTo(-120.2, 5);
    expect(points[1].lat).toBeCloseTo(40.7, 5);
    expect(points[1].lon).toBeCloseTo(-120.95, 5);
    expect(points[2].lat).toBeCloseTo(43.252, 5);
    expect(points[2].lon).toBeCloseTo(-126.453, 5);
  });

  it("returns an empty array for an empty string", () => {
    expect(decodePolyline("")).toEqual([]);
  });
});

describe("formatDuration", () => {
  it("returns <1 min below one rounded minute", () => {
    expect(formatDuration(0)).toBe("<1 min");
    expect(formatDuration(29)).toBe("<1 min");
    expect(formatDuration(-100)).toBe("<1 min");
  });

  it("returns whole minutes under an hour", () => {
    expect(formatDuration(30)).toBe("1 min");
    expect(formatDuration(90)).toBe("2 min");
    expect(formatDuration(60 * 59)).toBe("59 min");
  });

  it("returns hours and minutes at or above an hour", () => {
    expect(formatDuration(60 * 60)).toBe("1 h 0 min");
    expect(formatDuration(60 * 90)).toBe("1 h 30 min");
    expect(formatDuration(60 * 60 * 3)).toBe("3 h 0 min");
  });
});

describe("formatDistance", () => {
  it("returns whole meters below a kilometer", () => {
    expect(formatDistance(0)).toBe("0 m");
    expect(formatDistance(4.6)).toBe("5 m");
    expect(formatDistance(999)).toBe("999 m");
  });

  it("returns one decimal place for 1-10 km", () => {
    expect(formatDistance(1000)).toBe("1.0 km");
    expect(formatDistance(1540)).toBe("1.5 km");
    expect(formatDistance(9999)).toBe("10.0 km");
  });

  it("returns whole kilometers at 10 km and above", () => {
    expect(formatDistance(10_000)).toBe("10 km");
    expect(formatDistance(12_345)).toBe("12 km");
  });
});

describe("nearestNeighborOrder", () => {
  it("handles degenerate inputs", () => {
    expect(nearestNeighborOrder([])).toEqual([]);
    expect(nearestNeighborOrder([{ lat: 0, lon: 0 }])).toEqual([0]);
    expect(
      nearestNeighborOrder([
        { lat: 0, lon: 0 },
        { lat: 1, lon: 1 },
      ])
    ).toEqual([0, 1]);
  });

  it("keeps start and end fixed while reordering the middle", () => {
    const points = [
      { lat: 0, lon: 0 },
      { lat: 0, lon: 10 },
      { lat: 0, lon: 1 },
      { lat: 0, lon: 11 },
    ];
    const order = nearestNeighborOrder(points, 0, 3);
    expect(order).toEqual([0, 2, 1, 3]);
    expect(order[0]).toBe(0);
    expect(order[order.length - 1]).toBe(3);
  });

  it("returns a permutation containing every index exactly once", () => {
    const points = [
      { lat: 0, lon: 0 },
      { lat: 0, lon: 5 },
      { lat: 2, lon: 1 },
      { lat: 0, lon: 10 },
      { lat: -3, lon: 2 },
      { lat: 0, lon: 11 },
    ];
    const order = nearestNeighborOrder(points, 0, 5);
    expect([...order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(order[0]).toBe(0);
    expect(order[order.length - 1]).toBe(5);
  });

  it("clamps out-of-range start/end indices", () => {
    const points = [
      { lat: 0, lon: 0 },
      { lat: 1, lon: 0 },
      { lat: 2, lon: 0 },
    ];
    expect(nearestNeighborOrder(points, -5, 99)).toEqual([0, 1, 2]);
  });

  it("returns identity when start equals end", () => {
    const points = [
      { lat: 0, lon: 0 },
      { lat: 1, lon: 0 },
      { lat: 2, lon: 0 },
    ];
    expect(nearestNeighborOrder(points, 1, 1)).toEqual([0, 1, 2]);
  });
});
