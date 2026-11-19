"use client";

import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";
import { imageDownloadPath, mediaUrl } from "../lib/download-image";

export type SaveTarget = { url: string; label: string; title: string };
export type OpenSave = (image: SaveTarget) => void;

type ImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  save: SaveTarget;
  onSave: OpenSave;
};

const holdDuration = 480;
const movementLimit = 12;

export function SavableImage({ save, onSave, onClick, ...props }: ImageProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const start = useRef<{ x: number; y: number } | null>(null);
  const held = useRef(false);

  function cancelHold() {
    clearTimeout(timer.current);
    start.current = null;
  }
  function openSave() {
    if (held.current) return;
    cancelHold();
    held.current = true;
    onSave({ ...save, url: mediaUrl(save.url) });
  }
  useEffect(() => () => clearTimeout(timer.current), []);

  return <img {...props} src={props.src ? mediaUrl(props.src) : undefined} className={["savable-image", props.className].filter(Boolean).join(" ")}
    onPointerDown={event=>{
      held.current = false;
      cancelHold();
      if (!event.isPrimary || event.pointerType !== "touch") return;
      start.current = { x: event.clientX, y: event.clientY };
      timer.current = setTimeout(openSave, holdDuration);
    }}
    onPointerMove={event=>{
      if (start.current && Math.hypot(event.clientX-start.current.x, event.clientY-start.current.y)>movementLimit) cancelHold();
    }}
    onPointerCancel={cancelHold} onPointerUp={cancelHold} onPointerLeave={cancelHold}
    onContextMenu={event=>{
      if (event.nativeEvent instanceof PointerEvent && event.nativeEvent.pointerType === "mouse") return;
      if (!window.matchMedia("(any-pointer: coarse)").matches) return;
      event.preventDefault();
      if (start.current || !held.current) openSave();
    }}
    onClick={event=>{
      if (!held.current) onClick?.(event);
      held.current = false;
    }}/>;
}

export function SaveOptions({ image }: { image: SaveTarget }) {
  const [file, setFile] = useState<File | null>(null);
  const href = imageDownloadPath(image.url, image.title + " · " + image.label);
  useEffect(()=>{
    if (!href || !navigator.share || !navigator.canShare) return;
    const controller = new AbortController();
    async function prepare() {
      try {
        const response = await fetch(href!, { signal: controller.signal });
        if (!response.ok) return;
        const blob = await response.blob();
        const extension = ({ "image/jpeg":"jpg", "image/png":"png", "image/webp":"webp", "image/avif":"avif", "image/gif":"gif" } as Record<string,string>)[blob.type];
        if (!extension || controller.signal.aborted) return;
        const ready = new File([blob], image.title + " - " + image.label + "." + extension, { type: blob.type });
        if (navigator.canShare({ files:[ready] })) setFile(ready);
      } catch {
        // The direct download and original image remain available.
      }
    }
    void prepare();
    return ()=>controller.abort();
  },[href,image.label,image.title]);

  return <div className="save-options">
    {file && <button type="button" className="primary" onClick={()=>void navigator.share({files:[file]}).catch(()=>{})}>分享或保存图片</button>}
    {href && <a className="image-download" href={href} download>下载图片</a>}
    <a className="text-action" href={image.url} target="_blank" rel="noreferrer">打开原图</a>
  </div>;
}
