export type ImageFilter = (image: ImageData) => ImageData;

const index = (x: number, y: number, width: number) => {
  return (width * y + x) * 4;
};

const distributeError = (
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  errR: number,
  errG: number,
  errB: number
) => {
  addError(data, width, 7 / 16.0, x + 1, y, errR, errG, errB);
  addError(data, width, 3 / 16.0, x - 1, y + 1, errR, errG, errB);
  addError(data, width, 5 / 16.0, x, y + 1, errR, errG, errB);
  addError(data, width, 1 / 16.0, x + 1, y + 1, errR, errG, errB);
};

const addError = (
  data: Uint8ClampedArray,
  width: number,
  factor: number,
  x: number,
  y: number,
  errR: number,
  errG: number,
  errB: number
) => {
  let r = data[index(x, y, width)];
  let g = data[index(x, y, width) + 1];
  let b = data[index(x, y, width) + 2];
  data[index(x, y, width)] = r + errR * factor;
  data[index(x, y, width) + 1] = g + errG * factor;
  data[index(x, y, width) + 2] = b + errB * factor;
};

const calculateBrightness = (r: number, g: number, b: number) => {
  return Math.sqrt(r * r * 0.299 + g * g * 0.587 + b * b * 0.114) / 100;
};

export const grayscale = (image: ImageData) => {
  let scannedData = image.data;
  for (let i = 0; i < scannedData.length; i += 4) {
    const total = scannedData[i] + scannedData[i + 1] + scannedData[i + 2];
    const average = total / 3;
    scannedData[i] = average;
    scannedData[i + 1] = average;
    scannedData[i + 2] = average;
  }

  return image;
};

export const particleRain = (image: ImageData) => {
  return image; //TODO
};

export const passThrough = (image: ImageData) => {
  return image;
};

export const sobel = (image: ImageData) => {
  const kernal_x = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
  ];
  const kernal_y = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1],
  ];

  let px: number, py: number, val: number;
  let output = new ImageData(image.width, image.height);
  let data = output.data;

  image = grayscale(image);

  //kernal convolution
  for (let x: number = 1; x < image.width; x++) {
    for (let y: number = 1; y < image.height; y++) {
      px =
        kernal_x[0][0] * image.data[index(x - 1, y - 1, image.width)] +
        kernal_x[0][1] * image.data[index(x, y - 1, image.width)] +
        kernal_x[0][2] * image.data[index(x + 1, y - 1, image.width)] +
        kernal_x[1][0] * image.data[index(x - 1, y, image.width)] +
        kernal_x[1][1] * image.data[index(x, y, image.width)] +
        kernal_x[1][2] * image.data[index(x + 1, y, image.width)] +
        kernal_x[2][0] * image.data[index(x - 1, y + 1, image.width)] +
        kernal_x[2][1] * image.data[index(x, y + 1, image.width)] +
        kernal_x[2][2] * image.data[index(x + 1, y + 1, image.width)];
      py =
        kernal_y[0][0] * image.data[index(x - 1, y - 1, image.width)] +
        kernal_y[0][1] * image.data[index(x, y - 1, image.width)] +
        kernal_y[0][2] * image.data[index(x + 1, y - 1, image.width)] +
        kernal_y[1][0] * image.data[index(x - 1, y, image.width)] +
        kernal_y[1][1] * image.data[index(x, y, image.width)] +
        kernal_y[1][2] * image.data[index(x + 1, y, image.width)] +
        kernal_y[2][0] * image.data[index(x - 1, y + 1, image.width)] +
        kernal_y[2][1] * image.data[index(x, y + 1, image.width)] +
        kernal_y[2][2] * image.data[index(x + 1, y + 1, image.width)];

      val = Math.ceil(Math.sqrt(px! * px!) + Math.sqrt(py! * py!));

      //set pixel values (r,g,b,a)
      data[index(x, y, image.width)] = val;
      data[index(x, y, image.width) + 1] = val;
      data[index(x, y, image.width) + 2] = val;
      data[index(x, y, image.width) + 3] = 255;
    }
  }
  return output;
};

export const ditheringTest = (image: ImageData) => {
  let r, g, b;
  let output = new ImageData(image.width, image.height);
  let data = output.data;

  image = grayscale(image);

  for (let x: number = 0; x < image.width - 1; x++) {
    for (let y: number = 1; y < image.height - 1; y++) {
      const oldR = image.data[index(x, y, image.width)];
      const oldG = image.data[index(x, y, image.width) + 1];
      const oldB = image.data[index(x, y, image.width) + 2];

      const factor = 1;

      const newR = Math.round((factor * oldR) / 255) * (255 / factor);
      const newG = Math.round((factor * oldG) / 255) * (255 / factor);
      const newB = Math.round((factor * oldB) / 255) * (255 / factor);

      data[index(x, y, image.width)] = newR;
      data[index(x, y, image.width) + 1] = newG;
      data[index(x, y, image.width) + 2] = newB;
      data[index(x, y, image.width) + 3] = 255;

      const r_error = oldR - newR;
      const g_error = oldG - newG;
      const b_error = oldB - newB;

      //step 1
      r = data[index(x + 1, y, image.width)];
      g = data[index(x + 1, y, image.width) + 1];
      b = data[index(x + 1, y, image.width) + 2];
      r = r + (r_error * 7.0) / 16.0;
      g = g + (g_error * 7.0) / 16.0;
      b = b + (b_error * 7.0) / 16.0;
      data[index(x - 1, y + 1, image.width)] = r;
      data[index(x - 1, y + 1, image.width) + 1] = g;
      data[index(x - 1, y + 1, image.width) + 2] = b;
      // data[index(x + 1, y, image.width)] =
      //   data[index(x + 1, y, image.width)] + (r_error * 7.0) / 16.0;
      // data[index(x + 1, y, image.width) + 1] =
      //   data[index(x + 1, y, image.width) + 1] + (g_error * 7.0) / 16.0;
      // data[index(x + 1, y, image.width) + 2] =
      //   data[index(x + 1, y, image.width) + 2] + (b_error * 7.0) / 16.0;

      //step 2
      r = data[index(x - 1, y + 1, image.width)];
      g = data[index(x - 1, y + 1, image.width) + 1];
      b = data[index(x - 1, y + 1, image.width) + 2];
      r = r + (r_error * 3.0) / 16.0;
      g = g + (g_error * 3.0) / 16.0;
      b = b + (b_error * 3.0) / 16.0;
      data[index(x - 1, y + 1, image.width)] = r;
      data[index(x - 1, y + 1, image.width) + 1] = g;
      data[index(x - 1, y + 1, image.width) + 2] = b;
      // data[index(x + 1, y, image.width)] =
      //   data[index(x + 1, y, image.width)] + (r_error * 3.0) / 16.0;
      // data[index(x + 1, y, image.width) + 1] =
      //   data[index(x + 1, y, image.width) + 1] + (g_error * 3.0) / 16.0;
      // data[index(x + 1, y, image.width) + 2] =
      //   data[index(x + 1, y, image.width) + 2] + (b_error * 3.0) / 16.0;

      //step 3
      r = data[index(x, y + 1, image.width)];
      g = data[index(x, y + 1, image.width) + 1];
      b = data[index(x, y + 1, image.width) + 2];
      r = r + (r_error * 5.0) / 16.0;
      g = g + (g_error * 5.0) / 16.0;
      b = b + (b_error * 5.0) / 16.0;
      data[index(x, y + 1, image.width)] = r;
      data[index(x, y + 1, image.width) + 1] = g;
      data[index(x, y + 1, image.width) + 2] = b;
      // data[index(x + 1, y, image.width)] =
      //   data[index(x + 1, y, image.width)] + (r_error * 5.0) / 16.0;
      // data[index(x + 1, y, image.width) + 1] =
      //   data[index(x + 1, y, image.width) + 1] + (g_error * 5.0) / 16.0;
      // data[index(x + 1, y, image.width) + 2] =
      //   data[index(x + 1, y, image.width) + 2] + (b_error * 5.0) / 16.0;

      //step 4
      r = data[index(x + 1, y + 1, image.width)];
      g = data[index(x + 1, y + 1, image.width) + 1];
      b = data[index(x + 1, y + 1, image.width) + 2];
      r = r + (r_error * 1.0) / 16.0;
      g = g + (g_error * 1.0) / 16.0;
      b = b + (b_error * 1.0) / 16.0;
      data[index(x + 1, y + 1, image.width)] = r;
      data[index(x + 1, y + 1, image.width) + 1] = g;
      data[index(x + 1, y + 1, image.width) + 2] = b;
      // data[index(x + 1, y, image.width)] =
      //   data[index(x + 1, y, image.width)] + (r_error * 1.0) / 16.0;
      // data[index(x + 1, y, image.width) + 1] =
      //   data[index(x + 1, y, image.width) + 1] + (g_error * 1.0) / 16.0;
      // data[index(x + 1, y, image.width) + 2] =
      //   data[index(x + 1, y, image.width) + 2] + (b_error * 1.0) / 16.0;
    }
  }

  return output;
};

export const quantize = (image: ImageData) => {
  image = grayscale(image);

  for (let y: number = 0; y < image.height - 1; y++) {
    for (let x: number = 1; x < image.width - 1; x++) {
      const oldR = image.data[index(x, y, image.width)];
      const oldG = image.data[index(x, y, image.width) + 1];
      const oldB = image.data[index(x, y, image.width) + 2];

      const factor = 4; //TODO: create slider

      const newR = Math.round((factor * oldR) / 255) * (255 / factor);
      const newG = Math.round((factor * oldG) / 255) * (255 / factor);
      const newB = Math.round((factor * oldB) / 255) * (255 / factor);

      image.data[index(x, y, image.width)] = newR;
      image.data[index(x, y, image.width) + 1] = newG;
      image.data[index(x, y, image.width) + 2] = newB;
      image.data[index(x, y, image.width) + 3] = 255;
    }
  }

  return image;
};

export const dithering = (image: ImageData) => {
  image = grayscale(image);

  for (let y: number = 0; y < image.height - 1; y++) {
    for (let x: number = 1; x < image.width - 1; x++) {
      const oldR = image.data[index(x, y, image.width)];
      const oldG = image.data[index(x, y, image.width) + 1];
      const oldB = image.data[index(x, y, image.width) + 2];

      const factor = 4;

      const newR = Math.round((factor * oldR) / 255) * (255 / factor);
      const newG = Math.round((factor * oldG) / 255) * (255 / factor);
      const newB = Math.round((factor * oldB) / 255) * (255 / factor);

      image.data[index(x, y, image.width)] = newR;
      image.data[index(x, y, image.width) + 1] = newG;
      image.data[index(x, y, image.width) + 2] = newB;

      const errorR = oldR - newR;
      const errorG = oldG - newG;
      const errorB = oldB - newB;

      distributeError(image.data, image.width, x, y, errorR, errorG, errorB);
    }
  }
  return image;
};

export const test = (image: ImageData) => {
  image = quantize(image);
  image = sobel(image);

  return image;
};

export const filterArray: Array<(image: ImageData) => ImageData> = [
  grayscale,
  particleRain,
];

export const filters: Record<string, ImageFilter> = {
  passThrough: passThrough,
  grayscale: grayscale,
  quantize: quantize,
  dithering: dithering,
  sobel: sobel,
  test: test,
};
