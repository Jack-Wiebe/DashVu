export type ImageFilter = (image: ImageData, ...args: any[]) => ImageData;

const index = (x: number, y: number, width: number) => (width * y + x) * 4;

const lumaAt = (data: Uint8ClampedArray, i: number) =>
  data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;

const distributeError = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  errR: number,
  errG: number,
  errB: number
) => {
  addError(data, width, height, 7 / 16.0, x + 1, y, errR, errG, errB);
  addError(data, width, height, 3 / 16.0, x - 1, y + 1, errR, errG, errB);
  addError(data, width, height, 5 / 16.0, x, y + 1, errR, errG, errB);
  addError(data, width, height, 1 / 16.0, x + 1, y + 1, errR, errG, errB);
};

const addError = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  factor: number,
  x: number,
  y: number,
  errR: number,
  errG: number,
  errB: number
) => {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const i = index(x, y, width);
  data[i] = data[i] + errR * factor;
  data[i + 1] = data[i + 1] + errG * factor;
  data[i + 2] = data[i + 2] + errB * factor;
};

const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h / 6, s, l];
};

const hueToRgb = (p: number, q: number, t: number) => {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
};

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  if (s === 0) {
    const v = l * 255;
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    hueToRgb(p, q, h + 1 / 3) * 255,
    hueToRgb(p, q, h) * 255,
    hueToRgb(p, q, h - 1 / 3) * 255,
  ];
};

const toGrayscale = (image: ImageData): ImageData => {
  const out = new ImageData(image.width, image.height);
  const src = image.data;
  const dst = out.data;
  for (let i = 0; i < src.length; i += 4) {
    const v = src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114;
    dst[i] = v;
    dst[i + 1] = v;
    dst[i + 2] = v;
    dst[i + 3] = src[i + 3];
  }
  return out;
};

export const passThrough = (image: ImageData) => image;
export const grayscale = toGrayscale;
export const particleRain = (image: ImageData) => image;

export const invert = (image: ImageData) => {
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];
    data[i + 1] = 255 - data[i + 1];
    data[i + 2] = 255 - data[i + 2];
  }
  return image;
};

export const sepia = (image: ImageData) => {
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
    data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
    data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
  }
  return image;
};

export const brightness = (image: ImageData, amount: number = 0) => {
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, data[i] + amount));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + amount));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + amount));
  }
  return image;
};

export const contrast = (image: ImageData, factor: number = 100) => {
  const data = image.data;
  const f = (259 * (factor + 255)) / (255 * (259 - factor));
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, f * (data[i] - 128) + 128));
    data[i + 1] = Math.max(0, Math.min(255, f * (data[i + 1] - 128) + 128));
    data[i + 2] = Math.max(0, Math.min(255, f * (data[i + 2] - 128) + 128));
  }
  return image;
};

export const threshold = (image: ImageData, cutoff: number = 128) => {
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const val = gray >= cutoff ? 255 : 0;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
  }
  return image;
};

export const quantize = (image: ImageData, factor: number = 4) => {
  image = toGrayscale(image);
  const w = image.width,
    h = image.height;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = index(x, y, w);
      const oldR = image.data[i],
        oldG = image.data[i + 1],
        oldB = image.data[i + 2];
      const f = factor;
      image.data[i] = Math.round((f * oldR) / 255) * (255 / f);
      image.data[i + 1] = Math.round((f * oldG) / 255) * (255 / f);
      image.data[i + 2] = Math.round((f * oldB) / 255) * (255 / f);
    }
  }
  return image;
};

export const dithering = (image: ImageData, factor: number = 4) => {
  image = toGrayscale(image);
  const w = image.width,
    h = image.height;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = index(x, y, w);
      const oldR = image.data[i],
        oldG = image.data[i + 1],
        oldB = image.data[i + 2];
      const f = factor;
      const newR = Math.round((f * oldR) / 255) * (255 / f);
      const newG = Math.round((f * oldG) / 255) * (255 / f);
      const newB = Math.round((f * oldB) / 255) * (255 / f);
      image.data[i] = newR;
      image.data[i + 1] = newG;
      image.data[i + 2] = newB;
      const errR = oldR - newR,
        errG = oldG - newG,
        errB = oldB - newB;
      distributeError(image.data, w, h, x, y, errR, errG, errB);
    }
  }
  return image;
};

export const sobel = (image: ImageData) => {
  const kx = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
  ];
  const ky = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1],
  ];
  const w = image.width,
    h = image.height;
  const out = new ImageData(w, h);
  image = toGrayscale(image);
  const at = (x: number, y: number) => {
    const cx = x < 0 ? 0 : x >= w ? w - 1 : x;
    const cy = y < 0 ? 0 : y >= h ? h - 1 : y;
    return image.data[index(cx, cy, w)];
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = index(x, y, w);
      const alpha = image.data[i + 3];
      if (alpha === 0) {
        out.data[i] = out.data[i + 1] = out.data[i + 2] = 0;
        out.data[i + 3] = 0;
        continue;
      }
      let px = 0,
        py = 0;
      for (let kyv = 0; kyv < 3; kyv++)
        for (let kxv = 0; kxv < 3; kxv++) {
          const v = at(x + kxv - 1, y + kyv - 1);
          px += kx[kyv][kxv] * v;
          py += ky[kyv][kxv] * v;
        }
      const val = Math.ceil(Math.sqrt(px * px) + Math.sqrt(py * py));
      out.data[i] = out.data[i + 1] = out.data[i + 2] = val;
      out.data[i + 3] = alpha;
    }
  }
  return out;
};

export const test = (image: ImageData) => sobel(quantize(image, 4));

export const noise = (image: ImageData, intensity: number = 25) => {
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = (Math.random() - 0.5) * intensity * 2,
      g = (Math.random() - 0.5) * intensity * 2,
      b = (Math.random() - 0.5) * intensity * 2;
    data[i] = Math.max(0, Math.min(255, data[i] + r));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + g));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + b));
  }
  return image;
};

export const vignette = (image: ImageData, strength: number = 50) => {
  const data = image.data,
    w = image.width,
    h = image.height;
  const cx = w / 2,
    cy = h / 2,
    maxD = Math.sqrt(cx * cx + cy * cy);
  const s = strength / 100;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / maxD;
      const f = 1 - d * d * s;
      const i = index(x, y, w);
      data[i] = Math.max(0, data[i] * f);
      data[i + 1] = Math.max(0, data[i + 1] * f);
      data[i + 2] = Math.max(0, data[i + 2] * f);
    }
  return image;
};

export const saturate = (image: ImageData, amount: number = 0) => {
  const data = image.data;
  if (amount === 0) return image;
  const scale = 1 + amount / 100;
  for (let i = 0; i < data.length; i += 4) {
    if (scale < 1) {
      const y = lumaAt(data, i);
      data[i] = y + (data[i] - y) * scale;
      data[i + 1] = y + (data[i + 1] - y) * scale;
      data[i + 2] = y + (data[i + 2] - y) * scale;
    } else {
      const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
      const [r, g, b] = hslToRgb(h, Math.min(1, s * scale), l);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }
  return image;
};

export const hueRotate = (image: ImageData, degrees: number = 0) => {
  const data = image.data;
  const off = (((degrees % 360) + 360) % 360) / 360;
  if (off === 0) return image;
  for (let i = 0; i < data.length; i += 4) {
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    const [r, g, b] = hslToRgb((h + off) % 1, s, l);
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
  return image;
};

export const temperature = (image: ImageData, amount: number = 0) => {
  const data = image.data;
  const shift = (amount / 100) * 100;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i] + shift;
    data[i + 2] = data[i + 2] - shift;
  }
  return image;
};

export const gamma = (image: ImageData, value: number = 100) => {
  const data = image.data;
  const g = 100 / Math.max(1, value);
  const tbl = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) tbl[i] = 255 * Math.pow(i / 255, g);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = tbl[data[i]];
    data[i + 1] = tbl[data[i + 1]];
    data[i + 2] = tbl[data[i + 2]];
  }
  return image;
};

export const opacity = (image: ImageData, amount: number = 100) => {
  const data = image.data;
  const f = amount / 100;
  for (let i = 3; i < data.length; i += 4) data[i] = data[i] * f;
  return image;
};

export const solarize = (image: ImageData, threshold: number = 128) => {
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const y = lumaAt(data, i);
    const v = y < threshold ? y : 255 - y;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  }
  return image;
};

export const posterize = (image: ImageData, levels: number = 4) => {
  const data = image.data;
  const l = Math.max(2, Math.floor(levels));
  const step = 255 / (l - 1);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(data[i] / step) * step;
    data[i + 1] = Math.round(data[i + 1] / step) * step;
    data[i + 2] = Math.round(data[i + 2] / step) * step;
  }
  return image;
};

const GLOW_COLOR: [number, number, number] = [0, 240, 255];
export const edgeGlow = (image: ImageData, threshold: number = 40) => {
  const w = image.width,
    h = image.height;
  const src = image.data;
  const out = new ImageData(w, h);
  const dst = out.data;
  const cut = threshold / 100;
  const gray = toGrayscale(image);
  const at = (x: number, y: number) => {
    const cx = x < 0 ? 0 : x >= w ? w - 1 : x;
    const cy = y < 0 ? 0 : y >= h ? h - 1 : y;
    return gray.data[index(cx, cy, w)];
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = index(x, y, w);
      const alpha = src[i + 3];
      if (alpha === 0) {
        dst[i + 3] = 0;
        continue;
      }
      const tl = at(x - 1, y - 1),
        tc = at(x, y - 1),
        tr = at(x + 1, y - 1);
      const ml = at(x - 1, y),
        mr = at(x + 1, y);
      const bl = at(x - 1, y + 1),
        bc = at(x, y + 1),
        br = at(x + 1, y + 1);
      const gx = -tl - 2 * ml - bl + tr + 2 * mr + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      const mag = Math.min(1, Math.sqrt(gx * gx + gy * gy) / 1020);
      if (mag <= cut) {
        dst[i] = src[i];
        dst[i + 1] = src[i + 1];
        dst[i + 2] = src[i + 2];
        dst[i + 3] = alpha;
      } else {
        const k = Math.min(1, (mag - cut) / Math.max(1e-6, 1 - cut));
        const blend = (base: number, gl: number) => 255 - ((255 - base) * (255 - gl * k)) / 255;
        dst[i] = blend(src[i], GLOW_COLOR[0]);
        dst[i + 1] = blend(src[i + 1], GLOW_COLOR[1]);
        dst[i + 2] = blend(src[i + 2], GLOW_COLOR[2]);
        dst[i + 3] = alpha;
      }
    }
  return out;
};

const DUO: [number, number, number][][] = [
  [
    [0, 240, 255],
    [255, 0, 224],
  ],
  [
    [0, 240, 255],
    [120, 40, 200],
  ],
  [
    [0, 255, 140],
    [0, 240, 255],
  ],
];
export const duotone = (image: ImageData, pair: number = 1) => {
  const data = image.data;
  const [dark, light] = DUO[Math.max(0, Math.min(DUO.length - 1, Math.floor(pair) - 1))];
  for (let i = 0; i < data.length; i += 4) {
    const t = Math.max(0, Math.min(1, lumaAt(data, i) / 255));
    const s = t * t * (3 - 2 * t);
    data[i] = dark[0] + (light[0] - dark[0]) * s;
    data[i + 1] = dark[1] + (light[1] - dark[1]) * s;
    data[i + 2] = dark[2] + (light[2] - dark[2]) * s;
  }
  return image;
};

export const pixelate = (image: ImageData, blockSize: number = 8) => {
  const w = image.width,
    h = image.height;
  const out = new ImageData(w, h);
  const src = image.data,
    dst = out.data;
  const bs = Math.max(2, Math.floor(blockSize));
  for (let by = 0; by < h; by += bs) {
    for (let bx = 0; bx < w; bx += bs) {
      let r = 0,
        g = 0,
        b = 0,
        c = 0;
      for (let dy = 0; dy < bs && by + dy < h; dy++)
        for (let dx = 0; dx < bs && bx + dx < w; dx++) {
          const i = index(bx + dx, by + dy, w);
          r += src[i];
          g += src[i + 1];
          b += src[i + 2];
          c++;
        }
      const ar = r / c,
        ag = g / c,
        ab = b / c,
        aa = src[index(bx, by, w) + 3];
      for (let dy = 0; dy < bs && by + dy < h; dy++)
        for (let dx = 0; dx < bs && bx + dx < w; dx++) {
          const i = index(bx + dx, by + dy, w);
          dst[i] = ar;
          dst[i + 1] = ag;
          dst[i + 2] = ab;
          dst[i + 3] = aa;
        }
    }
  }
  return out;
};

export const channelShift = (image: ImageData, offset: number = 10) => {
  const w = image.width,
    h = image.height;
  const out = new ImageData(w, h);
  const src = image.data,
    dst = out.data;
  const o = Math.floor(offset);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = index(x, y, w);
      const rx = Math.min(w - 1, Math.max(0, x + o));
      const bx = Math.min(w - 1, Math.max(0, x - o));
      dst[i] = src[index(rx, y, w)];
      dst[i + 1] = src[i + 1];
      dst[i + 2] = src[index(bx, y, w) + 2];
      dst[i + 3] = src[i + 3];
    }
  return out;
};

export const glitch = (image: ImageData, amount: number = 30) => {
  const w = image.width,
    h = image.height;
  const out = new ImageData(w, h);
  const src = image.data,
    dst = out.data;
  const maxS = Math.round((amount / 100) * Math.max(4, w / 8));
  if (maxS === 0) {
    dst.set(src);
    return out;
  }
  let y = 0;
  while (y < h) {
    const bh = 1 + Math.floor(Math.random() * 4);
    const sh = Math.round((Math.random() * 2 - 1) * maxS);
    for (let dy = 0; dy < bh && y + dy < h; dy++) {
      const row = y + dy;
      for (let x = 0; x < w; x++) {
        const sx = Math.max(0, Math.min(w - 1, x + sh));
        const si = index(sx, row, w);
        const di = index(x, row, w);
        dst[di] = src[si];
        dst[di + 1] = src[si + 1];
        dst[di + 2] = src[si + 2];
        dst[di + 3] = src[si + 3];
      }
    }
    if (maxS >= 3 && Math.random() < 0.3) {
      const sp = Math.round(maxS / 3);
      const be = Math.min(h, y + bh);
      for (let row = y; row < be; row++)
        for (let x = 0; x < w; x++) {
          const di = index(x, row, w);
          const rx = Math.max(0, Math.min(w - 1, x + sp));
          dst[di] = src[index(rx, row, w)];
        }
    }
    y += bh;
  }
  return out;
};

export const mirror = (image: ImageData, mode: number = 1) => {
  const w = image.width,
    h = image.height;
  const out = new ImageData(w, h);
  const src = image.data,
    dst = out.data;
  const vert = Math.floor(mode) !== 2;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const sx = vert ? w - 1 - x : x;
      const sy = vert ? y : h - 1 - y;
      const si = index(sx, sy, w);
      const di = index(x, y, w);
      dst[di] = src[si];
      dst[di + 1] = src[si + 1];
      dst[di + 2] = src[si + 2];
      dst[di + 3] = src[si + 3];
    }
  return out;
};

function applyConvolution(image: ImageData, kernel: number[][]): ImageData {
  const out = new ImageData(image.width, image.height);
  const data = out.data;
  const w = image.width,
    h = image.height;
  const kSize = kernel.length,
    kHalf = Math.floor(kSize / 2);
  const at = (x: number, y: number) => {
    const cx = x < 0 ? 0 : x >= w ? w - 1 : x;
    const cy = y < 0 ? 0 : y >= h ? h - 1 : y;
    return index(cx, cy, w);
  };
  for (let x = 0; x < w; x++)
    for (let y = 0; y < h; y++) {
      let r = 0,
        g = 0,
        b = 0;
      for (let kyv = 0; kyv < kSize; kyv++)
        for (let kxv = 0; kxv < kSize; kxv++) {
          const i = at(x + kxv - kHalf, y + kyv - kHalf);
          const wv = kernel[kyv][kxv];
          r += image.data[i] * wv;
          g += image.data[i + 1] * wv;
          b += image.data[i + 2] * wv;
        }
      const i = index(x, y, w);
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
      data[i + 3] = image.data[i + 3];
    }
  return out;
}

export const emboss = (image: ImageData) =>
  applyConvolution(image, [
    [-2, -1, 0],
    [-1, 1, 1],
    [0, 1, 2],
  ]);
export const sharpen = (image: ImageData) =>
  applyConvolution(image, [
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0],
  ]);

export const boxBlur = (image: ImageData, radius: number = 1) => {
  const w = image.width,
    h = image.height;
  const r = Math.max(1, Math.floor(radius));
  const src = image.data;
  const temp = new Uint8ClampedArray(w * h * 4);
  const dst = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    let rS = 0,
      gS = 0,
      bS = 0,
      c = 0;
    for (let dx = -r; dx <= r; dx++) {
      const nx = dx < 0 ? 0 : dx >= w ? w - 1 : dx;
      const i = row + nx * 4;
      rS += src[i];
      gS += src[i + 1];
      bS += src[i + 2];
      c++;
    }
    temp[row] = rS / c;
    temp[row + 1] = gS / c;
    temp[row + 2] = bS / c;
    temp[row + 3] = src[row + 3];
    for (let x = 1; x < w; x++) {
      const rem = row + (x - r - 1 < 0 ? 0 : x - r - 1 >= w ? w - 1 : x - r - 1) * 4;
      const add = row + (x + r < 0 ? 0 : x + r >= w ? w - 1 : x + r) * 4;
      rS += src[add] - src[rem];
      gS += src[add + 1] - src[rem + 1];
      bS += src[add + 2] - src[rem + 2];
      const i = row + x * 4;
      temp[i] = rS / c;
      temp[i + 1] = gS / c;
      temp[i + 2] = bS / c;
      temp[i + 3] = src[i + 3];
    }
  }
  for (let x = 0; x < w; x++) {
    const col = x * 4;
    let rS = 0,
      gS = 0,
      bS = 0,
      c = 0;
    for (let dy = -r; dy <= r; dy++) {
      const ny = dy < 0 ? 0 : dy >= h ? h - 1 : dy;
      const i = ny * w * 4 + col;
      rS += temp[i];
      gS += temp[i + 1];
      bS += temp[i + 2];
      c++;
    }
    dst[col] = rS / c;
    dst[col + 1] = gS / c;
    dst[col + 2] = bS / c;
    dst[col + 3] = temp[col + 3];
    for (let y = 1; y < h; y++) {
      const rem = (y - r - 1 < 0 ? 0 : y - r - 1 >= h ? h - 1 : y - r - 1) * w * 4 + col;
      const add = (y + r < 0 ? 0 : y + r >= h ? h - 1 : y + r) * w * 4 + col;
      rS += temp[add] - temp[rem];
      gS += temp[add + 1] - temp[rem + 1];
      bS += temp[add + 2] - temp[rem + 2];
      const i = y * w * 4 + col;
      dst[i] = rS / c;
      dst[i + 1] = gS / c;
      dst[i + 2] = bS / c;
      dst[i + 3] = temp[i + 3];
    }
  }
  return new ImageData(dst, w, h);
};

export const gaussianBlur = (image: ImageData, radius: number = 1) => {
  const r = Math.max(1, Math.floor(radius));
  const size = r * 2 + 1;
  let sum = 0;
  const kernel: number[] = [];
  for (let i = 0; i < size; i++) {
    const x = i - r;
    const v = Math.exp(-(x * x) / (2 * (r / 3) * (r / 3)));
    kernel.push(v);
    sum += v;
  }
  for (let i = 0; i < size; i++) kernel[i] /= sum;
  const w = image.width,
    h = image.height;
  const src = image.data;
  const tr = new Float32Array(w * h),
    tg = new Float32Array(w * h),
    tb = new Float32Array(w * h);
  const orr = new Float32Array(w * h),
    og = new Float32Array(w * h),
    ob = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const ro = y * w;
    for (let x = 0; x < w; x++) {
      let rs = 0,
        gs = 0,
        bs = 0;
      const xm = Math.max(0, x - r),
        xM = Math.min(w - 1, x + r);
      for (let k = xm; k <= xM; k++) {
        const wv = kernel[k - x + r];
        const i = (ro + k) * 4;
        rs += src[i] * wv;
        gs += src[i + 1] * wv;
        bs += src[i + 2] * wv;
      }
      const id = ro + x;
      tr[id] = rs;
      tg[id] = gs;
      tb[id] = bs;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let rs = 0,
        gs = 0,
        bs = 0;
      const ym = Math.max(0, y - r),
        yM = Math.min(h - 1, y + r);
      for (let k = ym; k <= yM; k++) {
        const wv = kernel[k - y + r];
        const id = k * w + x;
        rs += tr[id] * wv;
        gs += tg[id] * wv;
        bs += tb[id] * wv;
      }
      const id = y * w + x;
      orr[id] = rs;
      og[id] = gs;
      ob[id] = bs;
    }
  }
  const out = new ImageData(w, h);
  const dst = out.data;
  for (let i = 0; i < w * h; i++) {
    dst[i * 4] = orr[i];
    dst[i * 4 + 1] = og[i];
    dst[i * 4 + 2] = ob[i];
    dst[i * 4 + 3] = src[i * 4 + 3];
  }
  return out;
};

export const filterArray: Array<(image: ImageData) => ImageData> = [grayscale, particleRain];

export const filters: Record<string, ImageFilter> = {
  passThrough,
  grayscale,
  sepia,
  invert,
  brightness,
  contrast,
  threshold,
  quantize,
  dithering,
  pixelate,
  noise,
  emboss,
  sharpen,
  boxBlur,
  gaussianBlur,
  sobel,
  vignette,
  channelShift,
  saturate,
  hueRotate,
  temperature,
  gamma,
  opacity,
  solarize,
  posterize,
  edgeGlow,
  duotone,
  glitch,
  mirror,
  test,
};

export type FilterGroup = "original" | "adjust" | "convert" | "stylize" | "blur" | "distort";
export type FilterSpec = {
  label: string;
  description: string;
  group: FilterGroup;
  defaultParam?: number;
  range?: [number, number];
  paramLabel?: string;
  step?: number;
  format?: (v: number) => string;
};

export const FILTER_GROUPS: { id: FilterGroup; label: string }[] = [
  { id: "original", label: "Original" },
  { id: "adjust", label: "Adjust" },
  { id: "convert", label: "Convert" },
  { id: "stylize", label: "Stylize" },
  { id: "blur", label: "Blur & Sharpen" },
  { id: "distort", label: "Distort" },
];

export const FILTER_SPECS: Record<string, FilterSpec> = {
  passThrough: { label: "Original", description: "No changes", group: "original" },
  brightness: {
    label: "Brightness",
    description: "Adjust light/dark",
    group: "adjust",
    defaultParam: 0,
    range: [-100, 100],
    paramLabel: "Amount",
  },
  contrast: {
    label: "Contrast",
    description: "Adjust contrast",
    group: "adjust",
    defaultParam: 100,
    range: [0, 200],
    paramLabel: "Factor",
  },
  saturate: {
    label: "Saturate",
    description: "Boost/drain color",
    group: "adjust",
    defaultParam: 0,
    range: [-100, 100],
    paramLabel: "Amount",
  },
  hueRotate: {
    label: "Hue Rotate",
    description: "Shift colors",
    group: "adjust",
    defaultParam: 0,
    range: [0, 360],
    paramLabel: "Degrees",
  },
  temperature: {
    label: "Temperature",
    description: "Warm/cool",
    group: "adjust",
    defaultParam: 0,
    range: [-100, 100],
    paramLabel: "Amount",
  },
  gamma: {
    label: "Gamma",
    description: "Midtones",
    group: "adjust",
    defaultParam: 100,
    range: [10, 300],
    paramLabel: "Value",
  },
  opacity: {
    label: "Opacity",
    description: "Fade",
    group: "adjust",
    defaultParam: 100,
    range: [0, 100],
    paramLabel: "Amount",
  },
  grayscale: { label: "Grayscale", description: "B&W", group: "convert" },
  invert: { label: "Invert", description: "Negative", group: "convert" },
  threshold: {
    label: "Threshold",
    description: "Binary",
    group: "convert",
    defaultParam: 128,
    range: [0, 255],
    paramLabel: "Cutoff",
  },
  quantize: {
    label: "Quantize",
    description: "Reduce colors",
    group: "convert",
    defaultParam: 4,
    range: [2, 16],
    paramLabel: "Levels",
    step: 1,
  },
  dithering: {
    label: "Dithering",
    description: "Floyd–Steinberg",
    group: "convert",
    defaultParam: 4,
    range: [2, 16],
    paramLabel: "Levels",
    step: 1,
  },
  solarize: {
    label: "Solarize",
    description: "Invert above cutoff",
    group: "convert",
    defaultParam: 128,
    range: [0, 255],
    paramLabel: "Threshold",
  },
  posterize: {
    label: "Posterize",
    description: "Color bands",
    group: "convert",
    defaultParam: 4,
    range: [2, 16],
    paramLabel: "Levels",
    step: 1,
  },
  sepia: { label: "Sepia", description: "Vintage", group: "stylize" },
  vignette: {
    label: "Vignette",
    description: "Dark corners",
    group: "stylize",
    defaultParam: 50,
    range: [0, 100],
    paramLabel: "Strength",
  },
  noise: {
    label: "Noise",
    description: "Grain",
    group: "stylize",
    defaultParam: 25,
    range: [0, 100],
    paramLabel: "Intensity",
  },
  duotone: {
    label: "Duotone",
    description: "Two-tone",
    group: "stylize",
    defaultParam: 1,
    range: [1, 3],
    step: 1,
    paramLabel: "Palette",
    format: (v) => ["Cyan/Magenta", "Cyan/Purple", "Green/Cyan"][v - 1] ?? "",
  },
  edgeGlow: {
    label: "Edge Glow",
    description: "Neon edges",
    group: "stylize",
    defaultParam: 40,
    range: [0, 100],
    paramLabel: "Sensitivity",
  },
  boxBlur: {
    label: "Box Blur",
    description: "Averaging",
    group: "blur",
    defaultParam: 1,
    range: [1, 4],
    paramLabel: "Radius",
    step: 1,
  },
  gaussianBlur: {
    label: "Gaussian Blur",
    description: "Smooth",
    group: "blur",
    defaultParam: 1,
    range: [1, 4],
    paramLabel: "Radius",
    step: 1,
  },
  sharpen: { label: "Sharpen", description: "Enhance", group: "blur" },
  emboss: { label: "Emboss", description: "Relief", group: "blur" },
  sobel: { label: "Edge Detect", description: "Sobel", group: "blur" },
  pixelate: {
    label: "Pixelate",
    description: "Mosaic",
    group: "distort",
    defaultParam: 8,
    range: [2, 32],
    paramLabel: "Block",
    step: 1,
  },
  channelShift: {
    label: "Channel Shift",
    description: "RGB offset",
    group: "distort",
    defaultParam: 10,
    range: [0, 40],
    paramLabel: "Offset",
    step: 1,
  },
  glitch: {
    label: "Glitch",
    description: "Datastream",
    group: "distort",
    defaultParam: 30,
    range: [0, 80],
    paramLabel: "Intensity",
    step: 1,
  },
  mirror: {
    label: "Mirror",
    description: "Reflect",
    group: "distort",
    defaultParam: 1,
    range: [1, 2],
    step: 1,
    paramLabel: "Axis",
    format: (v) => (v === 2 ? "Horizontal" : "Vertical"),
  },
};

export function getFilterSpec(name: string): FilterSpec | undefined {
  return FILTER_SPECS[name];
}
export function getFilterDefaultParam(name: string): number | undefined {
  return FILTER_SPECS[name]?.defaultParam;
}
export function hasFilterParam(name: string): boolean {
  return FILTER_SPECS[name]?.range !== undefined;
}
export function formatFilterParam(name: string, value: number): string {
  const s = FILTER_SPECS[name];
  return s?.format ? s.format(value) : String(Math.round(value));
}
