export type ArtStyle = "flow" | "truchet" | "waves";
export type ArtPalette = "aurora" | "ember" | "mono" | "candy";

export interface ArtStyleDefinition {
  id: ArtStyle;
  label: string;
  animated: boolean;
}

export const ART_STYLES: ArtStyleDefinition[] = [
  { id: "flow", label: "Flow", animated: true },
  { id: "truchet", label: "Truchet", animated: false },
  { id: "waves", label: "Waves", animated: true },
];

export interface Palette {
  label: string;
  bg: string;
  colors: string[];
}

export const PALETTES: Record<ArtPalette, Palette> = {
  aurora: {
    label: "Aurora",
    bg: "#0b1220",
    colors: ["#22d3ee", "#34d399", "#818cf8", "#a7f3d0", "#38bdf8"],
  },
  ember: {
    label: "Ember",
    bg: "#160b06",
    colors: ["#f97316", "#ef4444", "#fbbf24", "#fb7185", "#f59e0b"],
  },
  mono: {
    label: "Mono",
    bg: "#0f1115",
    colors: ["#e5e7eb", "#9ca3af", "#d1d5db", "#6b7280", "#f3f4f6"],
  },
  candy: {
    label: "Candy",
    bg: "#150b1c",
    colors: ["#f472b6", "#c084fc", "#22d3ee", "#facc15", "#4ade80"],
  },
};

export const ART_PALETTES = Object.keys(PALETTES) as ArtPalette[];

export interface ArtInstance {
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number, timeSec: number) => void;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickColor(rng: () => number, colors: string[]): string {
  return colors[Math.floor(rng() * colors.length)] ?? colors[0] ?? "#ffffff";
}

function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function createFlow(width: number, height: number, palette: Palette, seed: number): ArtInstance {
  const rng = mulberry32(seed);
  const scale = 0.0016;
  const offset = rng() * 1000;
  const count = Math.min(1600, Math.max(280, Math.round((width * height) / 900)));

  const particles = Array.from({ length: count }, () => ({
    x: rng() * width,
    y: rng() * height,
    speed: 0.5 + rng() * 1.4,
    life: 60 + rng() * 160,
    age: 0,
    color: pickColor(rng, palette.colors),
  }));

  const angleAt = (x: number, y: number, t: number) => {
    const a = Math.sin(x * scale + offset) + Math.cos(y * scale * 1.4 - offset);
    const b = Math.sin((x + y) * scale * 0.7 + t * 0.12) + Math.cos((x - y) * scale * 0.5);
    return (a + b) * Math.PI * 0.5;
  };

  const respawn = (particle: (typeof particles)[number], w: number, h: number) => {
    particle.x = rng() * w;
    particle.y = rng() * h;
    particle.speed = 0.5 + rng() * 1.4;
    particle.life = 60 + rng() * 160;
    particle.age = 0;
    particle.color = pickColor(rng, palette.colors);
  };

  return {
    draw(ctx, w, h, t) {
      ctx.fillStyle = withAlpha(palette.bg, 0.08);
      ctx.fillRect(0, 0, w, h);
      ctx.lineWidth = 1;

      for (const particle of particles) {
        const angle = angleAt(particle.x, particle.y, t);
        const nx = particle.x + Math.cos(angle) * particle.speed;
        const ny = particle.y + Math.sin(angle) * particle.speed;

        ctx.strokeStyle = particle.color;
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(nx, ny);
        ctx.stroke();

        particle.x = nx;
        particle.y = ny;
        particle.age += 1;

        if (
          particle.age > particle.life ||
          particle.x < -5 ||
          particle.x > w + 5 ||
          particle.y < -5 ||
          particle.y > h + 5
        ) {
          respawn(particle, w, h);
        }
      }
    },
  };
}

function createTruchet(width: number, height: number, palette: Palette, seed: number): ArtInstance {
  const rng = mulberry32(seed);
  const cell = 56;
  const cols = Math.ceil(width / cell) + 1;
  const rows = Math.ceil(height / cell) + 1;

  const tiles = Array.from({ length: cols * rows }, (_, index) => ({
    x: (index % cols) * cell,
    y: Math.floor(index / cols) * cell,
    flip: rng() < 0.5,
    color: pickColor(rng, palette.colors),
  }));

  return {
    draw(ctx, w, h) {
      ctx.fillStyle = palette.bg;
      ctx.fillRect(0, 0, w, h);
      ctx.lineWidth = 6;
      ctx.lineCap = "round";

      for (const tile of tiles) {
        ctx.strokeStyle = tile.color;

        if (!tile.flip) {
          ctx.beginPath();
          ctx.arc(tile.x, tile.y, cell / 2, 0, Math.PI / 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(tile.x + cell, tile.y + cell, cell / 2, Math.PI, Math.PI * 1.5);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(tile.x + cell, tile.y, cell / 2, Math.PI / 2, Math.PI);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(tile.x, tile.y + cell, cell / 2, Math.PI * 1.5, Math.PI * 2);
          ctx.stroke();
        }
      }
    },
  };
}

function createWaves(width: number, height: number, palette: Palette, seed: number): ArtInstance {
  const rng = mulberry32(seed);
  const layerCount = 7;

  const layers = Array.from({ length: layerCount }, (_, index) => ({
    baseY: (height * (index + 1)) / (layerCount + 1) + (rng() - 0.5) * 40,
    amp: 10 + rng() * 36,
    freq: 0.006 + rng() * 0.01,
    phase: rng() * Math.PI * 2,
    speed: 0.15 + rng() * 0.5,
    lineWidth: 1 + rng() * 2.5,
    color: pickColor(rng, palette.colors),
  }));

  return {
    draw(ctx, w, h, t) {
      ctx.fillStyle = palette.bg;
      ctx.fillRect(0, 0, w, h);
      ctx.lineJoin = "round";

      for (const layer of layers) {
        ctx.beginPath();
        ctx.strokeStyle = layer.color;
        ctx.lineWidth = layer.lineWidth;

        const step = 6;
        for (let x = 0; x <= w; x += step) {
          const y =
            layer.baseY +
            Math.sin(x * layer.freq + layer.phase + t * layer.speed) * layer.amp +
            Math.sin(x * layer.freq * 0.5 + layer.phase * 1.7) * layer.amp * 0.4;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.stroke();
      }
    },
  };
}

export function createArt(
  style: ArtStyle,
  seed: number,
  width: number,
  height: number,
  palette: Palette
): ArtInstance {
  switch (style) {
    case "truchet":
      return createTruchet(width, height, palette, seed);
    case "waves":
      return createWaves(width, height, palette, seed);
    case "flow":
    default:
      return createFlow(width, height, palette, seed);
  }
}
