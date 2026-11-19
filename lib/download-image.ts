import { memberAsset } from "../app/member-transport";

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
