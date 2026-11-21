import gzip
import json
import re
import zipfile
from urllib.parse import urlsplit
from pathlib import Path


def publish_runway_media(root, out, catalog, galleries):
    directory = out / "collection-reader"
    covers = directory / "covers"
    covers.mkdir(exist_ok=True)
    with zipfile.ZipFile(root / "runway-covers.zip") as thumbnails:
        for name in thumbnails.namelist():
            if not re.fullmatch(r"[a-z0-9-]+\.webp", name):
                raise ValueError("Invalid thumbnail name")
            (covers / name).write_bytes(thumbnails.read(name))
    details = directory / "shows"
    details.mkdir()
    with gzip.open(root / "runway-supplement.json.gz", "rt", encoding="utf-8") as handle:
        supplements = json.load(handle)
    for path in sorted((root / "data" / "runway-galleries").glob("*.json.gz")):
        with gzip.open(path, "rt", encoding="utf-8") as stream:
            supplements.update(json.load(stream))
    films = json.loads((root / "runway-films.json").read_text())
    films.update(json.loads((root / "data" / "matched-runway-films.json").read_text()))
    for slug, film in films.items():
        players = [film[key] for key in ("originalMp4", "embed") if film.get(key)]
        if not film.get("originalPage") or len(players) != 1:
            raise ValueError(f"Missing official film page or player for {slug}")
        for url in [film["originalPage"], *players]:
            parsed = urlsplit(url)
            host = parsed.hostname or ""
            if parsed.scheme != "https" or not host or any(
                host == blocked or host.endswith("." + blocked)
                for blocked in ("bilibili.com", "b23.tv", "bilivideo.com")
            ):
                raise ValueError(f"Unsupported runway film URL for {slug}")
    additions = json.loads((root / "runway-study-additions.json").read_text())
    brand_links = json.loads((root / "runway-brand-links.json").read_text())
    index = []
    for study in catalog["studies"]:
        slug = study["slug"]
        if not re.fullmatch(r"[a-z0-9-]+", slug):
            raise ValueError("Invalid series identifier")
        gallery = supplements.get(slug) or galleries.get(study["date"] + "-" + slug) or galleries.get(slug) or {}
        raw = gallery.get("images") or study["images"]
        images = []
        for picture in raw:
            url = picture.get("url", "")
            if not url.startswith("https://") or not re.search(r"\.(jpe?g|png|webp|avif|gif)(?:[?#]|$)", url, re.I):
                continue
            images.append({key: picture[key] for key in ("url", "thumbnailUrl", "number") if picture.get(key)})
        external = study.get("externalCollection")
        if not images and not films.get(slug) and not external:
            continue
        local_cover = directory / "covers" / (slug + ".webp")
        cover = "/collection-reader/covers/" + local_cover.name if local_cover.exists() else (images[0].get("thumbnailUrl") or images[0]["url"] if images else "")
        if not cover and external:
            cover = external.get("cover", "")
        item = {"slug": slug, "brand": study["designer"].split(" · ")[0], "season": study["season"], "cover": cover}
        source = gallery.get("sourceUrl") or next((p["sourceUrl"] for p in raw if p.get("sourceUrl")), study["sources"][0]["url"])
        data = {**item, "images": images, "film": films.get(slug), "source": source,
                "credit": gallery.get("credit") or next((p["credit"] for p in raw if p.get("credit")), "")}
        brand = item["brand"].strip()
        website = brand_links["brands"].get(brand)
        profile = brand_links["profiles"].get(brand)
        collection = brand_links["collections"].get(slug)
        data["brandLinks"] = []
        if website:
            data["brandLinks"].append(["品牌官网", website])
        elif profile:
            data["brandLinks"].append(profile)
        if collection:
            data["brandLinks"].append(["官网查看本季系列", collection])
        if external and external.get("matchedArchive") and not data["brandLinks"]:
            data["brandLinks"].append(["查看本季系列", source])
        index.append({**item, "brandLink": data["brandLinks"][-1] if data["brandLinks"] else None})
        if external and not images:
            raise ValueError(f"Missing images for linked collection {slug}")
        if external:
            data["externalCollection"] = external
            data["summary"] = study["summary"]
        notes = {key: study.get(key) for key in ("fabric", "color", "silhouette", "palette", "techniques", "sources")}
        data["notes"] = {**notes, **additions.get(slug, {})}
        (details / (slug + ".json")).write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    (directory / "shows.json").write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")))
