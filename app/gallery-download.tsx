import { useState } from "react";
import type { RunwayGallery } from "../lib/initial";

export default function GalleryDownload({gallery, slug}: {gallery: RunwayGallery; slug: string}) {
  const [progress, setProgress] = useState("");
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    setProgress("正在打包图片…");
    try {
      const { downloadZip } = await import("client-zip");
      const missing: number[] = [];
      async function* files() {
        for (const image of gallery.images) {
          try {
            const response = await fetch(image.url, { signal: AbortSignal.timeout(12000) });
            if (!response.ok || !response.headers.get("Content-Type")?.startsWith("image/")) {
              throw new Error("image");
            }
            const name = "look-" + String(image.number).padStart(2, "0");
            const extension = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(image.url)?.[1] ?? "jpg";
            yield { name: name + "." + extension, input: await response.blob() };
          } catch {
            missing.push(image.number);
          }
        }
        yield { name: "图集说明.txt", input: [
          gallery.sourceUrl, gallery.credit,
          missing.length ? "暂未能下载的造型：" + missing.join("、") : "",
        ].filter(Boolean).join("\n") };
      }
      const zip = await downloadZip(files()).blob();
      if (missing.length === gallery.images.length) throw new Error("gallery");
      const url = URL.createObjectURL(zip);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = slug + "-runway.zip";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      setProgress(missing.length ? "部分原图无法下载，已将可用图片打包。" : "图集已打包。");
    } catch {
      setProgress("图集暂时无法打包，请打开原图集。");
    } finally {
      setBusy(false);
    }
  }

  return <div>
    <button className="primary gallery-zip" type="button" onClick={() => void download()} disabled={busy}>
      {gallery.complete ? "打包下载整场（ZIP）" : "打包下载已收录图片（ZIP）"}
    </button>
    {progress && <p className="notice" role="status">{progress}</p>}
  </div>;
}
