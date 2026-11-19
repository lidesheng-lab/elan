"""Make a static copy of ÉLAN's public archive and available image assets."""
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from pathlib import Path
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen
import argparse
import gzip
import json
import re
import shutil
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SITE = "https://material-index-ld.lidesheng.chatgpt.site"
EXTENSIONS = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
    "image/avif": "avif", "image/gif": "gif",
}
HOSTS = {
    "assets.vogue.com", "cdn.mos.cms.futurecdn.net", "media.vogue.co.uk",
    "hermes.media.static.aol.com", "media.nowfashion.com", "prcdn.freetls.fastly.net",
    "fengchenwang.com", "d31flwjaqugbgy.cloudfront.net",
}
IMAGE = re.compile(r"\.(?:jpe?g|png|webp|avif|gif)$", re.I)
KEY = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
DATE = re.compile(r"\d{4}-\d{2}-\d{2}")
LIMIT = 8 * 1024 * 1024


def get_json(url):
    result = subprocess.run(
        ["curl", "-fsS", "--retry", "2", "--retry-delay", "1", "--max-time", "20", url],
        check=True, capture_output=True,
    )
    return json.loads(result.stdout)


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n")


def image_source(value):
    if not isinstance(value, str) or not value.startswith("https://"):
        return False
    parsed = urlparse(value)
    return (
        parsed.hostname in HOSTS and not parsed.username and not parsed.password
        and not parsed.fragment and parsed.netloc == parsed.hostname
        and bool(IMAGE.search(parsed.path))
    )


def image_sources(data):
    if isinstance(data, dict):
        for value in data.values():
            yield from image_sources(value)
    elif isinstance(data, list):
        for value in data:
            yield from image_sources(value)
    elif image_source(data):
        yield data


def localize(value, mapping):
    if isinstance(value, dict):
        return {key: localize(item, mapping) for key, item in value.items()}
    if isinstance(value, list):
        return [localize(item, mapping) for item in value]
    return mapping.get(value, value) if isinstance(value, str) else value


def collect():
    endpoints = (SITE + "/api/archive", "https://elan.lidesheng.art/api/archive")
    for endpoint in endpoints:
        try:
            archive = get_json(endpoint)
            break
        except (OSError, subprocess.CalledProcessError, ValueError):
            continue
    else:
        raise SystemExit("Public archive unavailable")
    if not isinstance(archive.get("studies"), list) or len(archive["studies"]) < 100:
        raise SystemExit("Public archive is incomplete")
    galleries = {}
    for study in archive["studies"]:
        if not study.get("hasRunway"):
            continue
        date, slug = study["date"], study["slug"]
        if not DATE.fullmatch(date) or len(slug) > 100 or not KEY.fullmatch(slug):
            raise ValueError("Invalid archive gallery identifier")
        query = urlencode({"date": date, "slug": slug})
        gallery_url = endpoint.rsplit("/", 1)[0] + "/archive/gallery?" + query
        galleries[date + "-" + slug] = get_json(gallery_url)
    return archive, galleries


def src_files():
    return [ROOT / "lib" / name for name in ("beauty.ts", "editorial-images.ts", "initial.ts")]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cache", type=Path)
    parser.add_argument("--skip-uncached", action="store_true")
    args = parser.parse_args()
    started = time.monotonic()
    try:
        archive, daily = collect()
    except (SystemExit, OSError, ValueError, subprocess.CalledProcessError):
        with gzip.open(ROOT / "data" / "archive-seed.json.gz", "rt", encoding="utf-8") as file:
            seed = json.load(file)
        archive, daily = seed["archive"], seed["galleries"]
        print("Live archive temporarily unavailable; publishing saved archive", flush=True)
    with gzip.open(ROOT / "data" / "runways.json.gz", "rt", encoding="utf-8") as file:
        runways = json.load(file)
    inline = {
        url for file in src_files()
        for url in re.findall(r'https://[^"\'\s]+', file.read_text())
        if image_source(url)
    }
    sources = set(inline).union(image_sources(archive))
    thumbnail_sources = {}
    for gallery in [*runways.values(), *daily.values()]:
        for image in gallery["images"]:
            url = image.get("url")
            thumbnail = image.get("thumbnailUrl")
            if image_source(url):
                sources.add(url)
                if image_source(thumbnail):
                    thumbnail_sources[thumbnail] = url
    media = PUBLIC / "media"
    media.mkdir(exist_ok=True)
    cached = {
        path.stem: path for path in args.cache.iterdir()
        if path.suffix[1:] in EXTENSIONS.values()
    } if args.cache else {}
    present = {path.stem: path for path in media.iterdir() if path.is_file()}

    def fetch_image(url):
        digest = sha256(url.encode()).hexdigest()
        if digest in present:
            return url, "./media/" + present[digest].name
        if digest in cached:
            existing = cached[digest]
            shutil.copyfile(existing, media / existing.name)
            return url, "./media/" + existing.name
        if args.skip_uncached and url not in inline:
            return None
        try:
            request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urlopen(request, timeout=7) as response:
                extension = EXTENSIONS.get(response.headers.get_content_type())
                if not extension or not image_source(response.geturl()):
                    return None
                data = response.read(LIMIT + 1)
            if not 0 < len(data) <= LIMIT:
                return None
            name = digest + "." + extension
            (media / name).write_bytes(data)
            return url, "./media/" + name
        except (OSError, ValueError):
            return None

    with ThreadPoolExecutor(max_workers=24) as pool:
        mapping = dict(entry for entry in pool.map(fetch_image, sorted(sources)) if entry)
    image_count = len(mapping)
    for thumbnail, original in thumbnail_sources.items():
        if original in mapping and thumbnail not in mapping:
            mapping[thumbnail] = mapping[original]
    write_json(ROOT / "lib" / "media-map.json", {url: mapping[url] for url in sorted(inline & mapping.keys())})
    write_json(PUBLIC / "data" / "archive.json", localize(archive, mapping))
    for slug, gallery in daily.items():
        write_json(PUBLIC / "data" / "runways" / (slug + ".json"), localize(gallery, mapping))
    for slug, gallery in runways.items():
        write_json(PUBLIC / "runways" / (slug + ".json"), localize(gallery, mapping))
    (PUBLIC / ".nojekyll").touch()
    print(f"{len(archive['studies'])} brand studies, {len(archive['trends'])} trends, "
          f"{len(runways) + len(daily)} galleries, {image_count}/{len(sources)} images hosted locally "
          f"in {time.monotonic() - started:.1f} seconds", flush=True)


if __name__ == "__main__":
    main()
