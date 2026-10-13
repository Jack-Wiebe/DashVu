"use client";

import React, { useRef, useEffect } from "react";
import type { WidgetComponentProps } from "@/types/widget";
import { Button } from "../ui/Button";
import { Shuffle, ChevronRight, ChevronLeft } from "lucide-react";
import { ImageFilter, filters } from "@/lib/filters";

const GalleryWidget: React.FC<WidgetComponentProps> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const originalImageSrcRef = useRef<string>("");
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const currentFilterRef = useRef<number>(0);

  useEffect(() => {
    contextRef.current = canvasRef.current?.getContext("2d") ?? null;
    if (contextRef.current == null) throw new Error("Could not get context");

    // image = generateImage();
    // requestImgFromAPI();
    (async () => {
      imageRef.current = generateImage();
      await requestImgFromAPI();
    })();
    //initGallery().then(() => console.log("hello"));

    const requestResizeImage = () => {
      //console.log("Calling new image from resize");
      requestImgFromAPI();
    };

    const resizeListener = () => {
      clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = setTimeout(() => {
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
      loadImage(contextRef.current);
    };

    return img;
  };

  //create request to picsum API
  const requestImgFromAPI = async () => {
    const api: RequestInfo =
      "https://picsum.photos/" +
      canvasRef.current?.width +
      "/" +
      canvasRef.current?.height +
      "?random=2";
    const request = new Request(api);
    await fetch(request)
      .then((response) => response.blob())
      .then((blob) => {
        if (!imageRef.current) return;
        imageRef.current.src = URL.createObjectURL(blob);
        originalImageSrcRef.current = imageRef.current.src;
        //console.log(originalImageSrc);
      });
  };

  const resetImageSource = () => {
    if (imageRef.current) imageRef.current.src = originalImageSrcRef.current;
  };

  const loadImage = (context: CanvasRenderingContext2D | null) => {
    //clear the canvas
    context?.clearRect(0, 0, canvasRef.current?.width!, canvasRef.current?.height!);

    //draw the new image
    if (imageRef.current) {
      context?.drawImage(
        imageRef.current,
        0,
        0,
        canvasRef.current?.width!,
        canvasRef.current?.height!
      );
    }

    applyFilter();
  };

  const clearCanvas = () => {
    contextRef.current?.clearRect(0, 0, canvasRef.current?.width!, canvasRef.current?.height!);
  };

  const applyFilter = () => {
    //get Image Data
    let imageData: ImageData = contextRef.current?.getImageData(
      0,
      0,
      canvasRef.current?.width!,
      canvasRef.current?.height!
    )!;

    //apply filter to image data
    const func = Object.keys(filters)[currentFilterRef.current];
    if (func) imageData = filters[func as keyof Record<string, ImageFilter>](imageData);

    //console.log(imageData);

    //redraw image
    contextRef.current?.clearRect(0, 0, canvasRef.current?.width!, canvasRef.current?.height!);
    contextRef.current?.putImageData(imageData, 0, 0);
  };

  //
  //Handlers
  //

  const shuffleImage = async () => {
    contextRef.current = canvasRef.current?.getContext("2d") ?? null;
    clearCanvas();
    imageRef.current = generateImage();
    await requestImgFromAPI();
  };

  const nextFilter = () => {
    currentFilterRef.current = (currentFilterRef.current + 1) % Object.keys(filters).length;
    //console.log("Filter number = ", currentFilter);

    contextRef.current = canvasRef.current?.getContext("2d") ?? null;

    clearCanvas();
    imageRef.current = generateImage();
    resetImageSource();
    applyFilter();
  };

  const previousFilter = () => {
    currentFilterRef.current =
      (currentFilterRef.current + Object.keys(filters).length - 1) % Object.keys(filters).length;
    //console.log("Filter number = ", currentFilter);

    contextRef.current = canvasRef.current?.getContext("2d") ?? null;

    clearCanvas();
    imageRef.current = generateImage();
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
