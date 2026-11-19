import { memberAsset, membership } from "../app/member-transport";

const privateImage = /^https:\/\/elan-d8gtdxsaw5a7788d2-1507516836\.ap-shanghai\.app\.tcloudbase\.com\/newsletter\?picture=/;

export function isImageUrl(url: string) {
  return privateImage.test(url) || /^https:\/\/[^\s]+\.(?:jpe?g|png|webp|avif|gif)(?:[?#]|$)/i.test(url);
}

export function mediaUrl(url: string) {
  return isImageUrl(url) ? memberAsset(url) : url;
}

export function imageDownloadPath(url: string, _name: string): string | null {
  const asset = mediaUrl(url);
  return privateImage.test(asset) ? asset : null;
}

export function fetchMemberPhoto(url: string, signal?: AbortSignal) {
  const asset = mediaUrl(url);
  if (!privateImage.test(asset)) return Promise.reject(new Error("图片暂不可用。"));
  return fetch(asset, { headers: { Authorization: "Bearer " + membership().session }, signal });
}

export async function downloadMemberPhoto(url: string, name: string) {
  const response = await fetchMemberPhoto(url, AbortSignal.timeout(12000));
  if (!response.ok) throw new Error("图片暂时无法下载。");
  const blob = await response.blob();
  const type = blob.type.split(";")[0].slice(6);
  const asset = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = asset;
  link.download = name + "." + (type === "jpeg" ? "jpg" : type || "jpg");
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(asset), 2000);
}
