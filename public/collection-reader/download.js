const endpoint = "https://elan-d8gtdxsaw5a7788d2-1507516836.ap-shanghai.app.tcloudbase.com/newsletter";

async function readLook(slug, index, signal) {
  const url = new URL(endpoint);
  url.search = new URLSearchParams({view: "runway-look", show: slug, look: String(index + 1)});
  for (let attempt = 0; attempt < 3; attempt++) {
    signal.throwIfAborted();
    try {
      const response = await fetch(url, {signal: AbortSignal.any([signal, AbortSignal.timeout(25000)])});
      if (!response.ok) throw Error("图片读取失败");
      const blob = await response.blob();
      const extension = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif"}[blob.type.split(";")[0]];
      if (!extension || !blob.size) throw Error("图片格式无效");
      return {bytes: await blob.arrayBuffer(), extension};
    } catch (error) {
      if (attempt === 2 || signal.aborted) throw error;
      await new Promise(resolve => setTimeout(resolve, 600 * (attempt + 1)));
    }
  }
}

export function attachDownload(actions, show) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "member-secondary";
  const label = "一键下载秀场（ZIP · " + show.images.length + " 张）";
  button.textContent = label;
  const status = document.createElement("span");
  status.setAttribute("role", "status");
  actions.append(button, status);
  button.onclick = async () => {
    if (button.disabled) return;
    button.disabled = true;
    const controller = new AbortController();
    const leave = () => controller.abort();
    window.addEventListener("pagehide", leave, {once: true});
    let completed = 0;
    try {
      await import("./vendor/jszip.min.js");
      const zip = new window.JSZip();
      let next = 0;
      async function collect() {
        while (next < show.images.length) {
          if (!button.isConnected) controller.abort();
          const index = next++;
          const {bytes, extension} = await readLook(show.slug, index, controller.signal);
          zip.file(String(index + 1).padStart(3, "0") + "-Look-" + (show.images[index].number || index + 1) + "." + extension, bytes);
          status.textContent = "已读取 " + (++completed) + " / " + show.images.length + " 张";
        }
      }
      status.textContent = "正在读取系列图片…";
      await Promise.all(Array.from({length: Math.min(4, show.images.length)}, collect));
      zip.file("图片来源.txt", [show.brand, show.season, show.credit, show.source].filter(Boolean).join("\n"));
      status.textContent = "正在生成 ZIP…";
      const blob = await zip.generateAsync({type: "blob", compression: "STORE"});
      const save = document.createElement("a");
      save.href = URL.createObjectURL(blob);
      save.download = show.slug + ".zip";
      save.className = "member-secondary";
      save.textContent = "保存 ZIP（" + show.images.length + " 张）";
      button.replaceWith(save);
      status.textContent = "已生成完整图集";
      save.click();
      window.addEventListener("pagehide", () => URL.revokeObjectURL(save.href), {once:true});
    } catch {
      controller.abort();
      status.textContent = "下载未完成，请点击重试。";
      button.disabled = false;
    } finally {
      window.removeEventListener("pagehide", leave);
    }
  };
}
