import gzip
import json
import re
import zipfile
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
    films = json.loads((root / "runway-films.json").read_text())
    additions = json.loads((root / "runway-study-additions.json").read_text())
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
            if not url.startswith("https://") or not re.search(r"\.(jpe?g|png|webp|avif)(?:[?#]|$)", url, re.I):
                continue
            images.append({key: picture[key] for key in ("url", "thumbnailUrl", "number") if picture.get(key)})
        if not images and not films.get(slug):
            continue
        local_cover = directory / "covers" / (slug + ".webp")
        cover = "/collection-reader/covers/" + local_cover.name if local_cover.exists() else (images[0].get("thumbnailUrl") or images[0]["url"] if images else "")
        item = {"slug": slug, "brand": study["designer"].split(" · ")[0], "season": study["season"], "cover": cover}
        index.append(item)
        source = gallery.get("sourceUrl") or next((p["sourceUrl"] for p in raw if p.get("sourceUrl")), study["sources"][0]["url"])
        data = {**item, "images": images, "film": films.get(slug), "source": source,
                "credit": gallery.get("credit") or next((p["credit"] for p in raw if p.get("credit")), "")}
        notes = {key: study.get(key) for key in ("fabric", "color", "silhouette", "palette", "techniques", "sources")}
        data["notes"] = {**notes, **additions.get(slug, {})}
        (details / (slug + ".json")).write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    (directory / "shows.json").write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")))
