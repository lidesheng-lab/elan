import mediaMap from "./media-map.json";

const localImage = /^\.\/media\/[a-f0-9]{64}\.(?:jpe?g|png|webp|avif|gif)$/i;

export function isImageUrl(url: string) {
  return localImage.test(url) || /^https:\/\/[^\s]+\.(?:jpe?g|png|webp|avif|gif)(?:[?#]|$)/i.test(url);
}

export function mediaUrl(url: string) {
  return (mediaMap as Record<string, string>)[url] ?? url;
}

export function imageDownloadPath(url: string, _name: string): string | null {
  const asset = mediaUrl(url);
  return localImage.test(asset) ? asset : null;
}
