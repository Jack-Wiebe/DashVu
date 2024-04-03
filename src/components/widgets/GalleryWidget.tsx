import React, { useRef, useEffect } from "react";
import WidgetProps from "@/types/widget";
import { Button } from "../ui/Button";
import { Shuffle, ChevronRight, ChevronLeft } from "lucide-react";
import { ImageFilter, filters } from "@/lib/filters";

const GalleryWidget: React.FC<WidgetProps> = ({ props, className }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  let context: CanvasRenderingContext2D | null | undefined = null;
  let image: HTMLImageElement;
  let originalImageSrc: string = "";

  let resizeTimeout: ReturnType<typeof setTimeout>;

  let currentFilter: number = 0;

  useEffect(() => {
    context = canvasRef?.current?.getContext("2d");
    if (context == null) throw new Error("Could not get context");

    // image = generateImage();
    // requestImgFromAPI();
    (async () => {
      image = generateImage();
      await requestImgFromAPI();
    })();
    //initGallery().then(() => console.log("hello"));

    const requestResizeImage = () => {
      //console.log("Calling new image from resize");
      requestImgFromAPI();
    };

    const resizeListener = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        requestResizeImage();
      }, 100);
    };
    // set resize listener
    window.addEventListener("resize", resizeListener);
    // clean up function
    return () => {
      // remove resize listener
      window.removeEventListener("resize", resizeListener);
    };
  });

  const generateImage = () => {
    let img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      loadImage(context!);
    };

    return img;
  };

  //create request to picsum API
  const requestImgFromAPI = async () => {
    const api: RequestInfo =
      "https://picsum.photos/" +
      canvasRef?.current?.width +
      "/" +
      canvasRef?.current?.height +
      "?random=2";
    const request = new Request(api);
    await fetch(request)
      .then((response) => response.blob())
      .then((blob) => {
        image.src = URL.createObjectURL(blob);
        originalImageSrc = image.src;
        //console.log(originalImageSrc);
      });
  };

  const resetImageSource = () => {
    image.src = originalImageSrc;
  };

  const loadImage = (context: CanvasRenderingContext2D | null | undefined) => {
    //clear the canvas
    context?.clearRect(
      0,
      0,
      canvasRef?.current?.width!,
      canvasRef?.current?.height!
    );

    //draw the new image
    context?.drawImage(
      image,
      0,
      0,
      canvasRef?.current?.width!,
      canvasRef?.current?.height!
    );

    applyFilter();
  };

  const clearCanvas = () => {
    context?.clearRect(
      0,
      0,
      canvasRef?.current?.width!,
      canvasRef?.current?.height!
    );
  };

  const applyFilter = () => {
    //get Image Data
    let imageData: ImageData = context?.getImageData(
      0,
      0,
      canvasRef?.current?.width!,
      canvasRef?.current?.height!
    )!;

    //apply filter to image data
    const func = Object.keys(filters)[currentFilter];
    if (func)
      imageData = filters[func as keyof Record<string, ImageFilter>](imageData);

    //console.log(imageData);

    //redraw image
    context?.clearRect(
      0,
      0,
      canvasRef?.current?.width!,
      canvasRef?.current?.height!
    );
    context?.putImageData(imageData, 0, 0);
  };

  //
  //Handlers
  //

  const shuffleImage = async () => {
    context = canvasRef?.current?.getContext("2d");
    clearCanvas();
    image = generateImage();
    await requestImgFromAPI();
  };

  const nextFilter = () => {
    currentFilter = (currentFilter + 1) % Object.keys(filters).length;
    //console.log("Filter number = ", currentFilter);

    context = canvasRef?.current?.getContext("2d");

    clearCanvas();
    image = generateImage();
    resetImageSource();
    applyFilter();
  };

  const previousFilter = () => {
    currentFilter =
      (currentFilter + Object.keys(filters).length - 1) %
      Object.keys(filters).length;
    //console.log("Filter number = ", currentFilter);

    context = canvasRef?.current?.getContext("2d");

    clearCanvas();
    image = generateImage();
    resetImageSource();
    applyFilter();
  };

  //
  //Rendering
  //

  return (
    <div className={className}>
      <canvas className="w-full h-4/5 mt-1 mb-3" ref={canvasRef} />
      <div className="flex items-center justify-evenly gap-2">
        <Button onClick={previousFilter}>
          <ChevronLeft />
        </Button>
        <Button onClick={shuffleImage}>
          <Shuffle />
        </Button>
        <Button onClick={nextFilter}>
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
};

export default GalleryWidget;
