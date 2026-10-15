"use client";

import React, { useCallback, useRef, useEffect, useState } from "react";
import type { WidgetComponentProps } from "@/types/widget";
import { Button } from "../ui/Button";
import { Shuffle, Upload, Download, Dices } from "lucide-react";
import {
  filters,
  FILTER_GROUPS,
  FILTER_SPECS,
  getFilterDefaultParam,
  hasFilterParam,
  formatFilterParam,
} from "@/lib/filters";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "../ui/dropdown-menu";
import { Slider } from "../ui/slider";

const GalleryWidget: React.FC<WidgetComponentProps> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [selectedFilterId, setSelectedFilterId] = useState<string>("passThrough");
  const [filterParam, setFilterParam] = useState<number | undefined>(() =>
    getFilterDefaultParam("passThrough")
  );
  const [isUploaded, setIsUploaded] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const applyFilter = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx || canvas.width === 0 || canvas.height === 0) return;
    let src: ImageData;
    try {
      src = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch {
      return;
    }
    const copy = new ImageData(new Uint8ClampedArray(src.data), canvas.width, canvas.height);
    const id = selectedFilterId;
    const filter = (filters as Record<string, (img: ImageData, param?: number) => ImageData>)[id];
    let out: ImageData = copy;
    if (filter) {
      const param = filterParam ?? getFilterDefaultParam(id);
      out = hasFilterParam(id) && param !== undefined ? filter(copy, param) : filter(copy);
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(out, 0, 0);
  }, [selectedFilterId, filterParam]);

  const redrawWithCurrent = useCallback(() => {
    const ctx = contextRef.current;
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!ctx || !canvas || !img || !img.complete || size.width === 0 || size.height === 0) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, size.width, size.height);
    applyFilter();
  }, [size.width, size.height, applyFilter]);

  const createImage = useCallback(() => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => latest.current.redraw();
    return img;
  }, []);

  const requestImgFromAPI = useCallback(async () => {
    if (size.width === 0 || size.height === 0) return;
    const w = Math.max(1, Math.floor(size.width));
    const h = Math.max(1, Math.floor(size.height));
    try {
      const response = await fetch(`https://picsum.photos/${w}/${h}?random=2`);
      const blob = await response.blob();
      if (!imageRef.current) imageRef.current = createImage();
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      setIsUploaded(false);
      imageRef.current.src = url;
    } catch {
      return;
    }
  }, [size.width, size.height, createImage]);

  const latest = useRef({
    redraw: () => {},
    fetch: async () => {},
    isUploaded: false,
  });
  latest.current.redraw = redrawWithCurrent;
  latest.current.fetch = requestImgFromAPI;
  latest.current.isUploaded = isUploaded;

  useEffect(() => {
    contextRef.current = canvasRef.current?.getContext("2d") ?? null;
    if (!imageRef.current) imageRef.current = createImage();
  }, [createImage]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        setSize({
          width: Math.max(1, Math.round(rect.width)),
          height: Math.max(1, Math.round(rect.height)),
        });
      }, 120);
    });
    observer.observe(el);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0 || size.height === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(size.width * dpr);
    canvas.height = Math.floor(size.height * dpr);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    contextRef.current = ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (latest.current.isUploaded) latest.current.redraw();
    else latest.current.fetch();
  }, [size.width, size.height]);

  useEffect(() => {
    const onResize = () => {
      clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = setTimeout(() => {
        if (latest.current.isUploaded) latest.current.redraw();
        else latest.current.fetch();
      }, 100);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    redrawWithCurrent();
  }, [redrawWithCurrent]);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  const shuffleImage = () => {
    latest.current.fetch();
  };

  const onUploadClick = () => {
    uploadRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      if (!imageRef.current) imageRef.current = createImage();
      setIsUploaded(true);
      imageRef.current.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const onDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `dashvu-gallery-${selectedFilterId}.png`;
      a.click();
    } catch {
      return;
    }
  };

  const onFilterSelect = (id: string) => {
    setSelectedFilterId(id);
    setFilterParam(getFilterDefaultParam(id));
  };

  const randomizeFilter = () => {
    const ids = Object.keys(FILTER_SPECS).filter((id) => id !== "passThrough");
    const id = ids[Math.floor(Math.random() * ids.length)];
    setSelectedFilterId(id);
    setFilterParam(getFilterDefaultParam(id));
  };

  const currentParam = filterParam ?? getFilterDefaultParam(selectedFilterId) ?? 0;

  return (
    <div className={className}>
      <div ref={containerRef} className="w-full h-4/5 mt-1 mb-3">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button size="xs" variant="ghost" onClick={onUploadClick} aria-label="Upload image">
            <Upload className="h-3.5 w-3.5" />
          </Button>
          <input ref={uploadRef} type="file" accept="image/*" hidden onChange={onFileChange} />
          <Button
            size="xs"
            variant="ghost"
            onClick={shuffleImage}
            aria-label="Shuffle random image"
          >
            <Shuffle className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={onDownload}
            aria-label="Download filtered image"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex w-40 items-center gap-1">
            {hasFilterParam(selectedFilterId) && (
              <>
                <Slider
                  value={[currentParam]}
                  min={FILTER_SPECS[selectedFilterId]?.range?.[0]}
                  max={FILTER_SPECS[selectedFilterId]?.range?.[1]}
                  step={FILTER_SPECS[selectedFilterId]?.step ?? 1}
                  onValueChange={([v]) => setFilterParam(v)}
                />
                <span className="w-8 text-right text-xs">
                  {formatFilterParam(selectedFilterId, currentParam)}
                </span>
              </>
            )}
          </div>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button size="xs" variant="outline">
                {FILTER_SPECS[selectedFilterId]?.label ?? selectedFilterId}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
              {FILTER_GROUPS.map((group) => (
                <React.Fragment key={group.id}>
                  <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                  {Object.entries(FILTER_SPECS)
                    .filter(([, spec]) => spec.group === group.id)
                    .map(([id, spec]) => (
                      <DropdownMenuItem
                        key={id}
                        onSelect={() => onFilterSelect(id)}
                        className={selectedFilterId === id ? "bg-zinc-800" : ""}
                      >
                        {spec.label}
                      </DropdownMenuItem>
                    ))}
                </React.Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="xs" variant="ghost" onClick={randomizeFilter} aria-label="Randomize filter">
            <Dices className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GalleryWidget;
