"""Package the public ÉLAN pages without member archives or media."""
from pathlib import Path
from datetime import date, datetime
from hashlib import sha256
import gzip
import json
import re
import shutil
from urllib.parse import unquote, urlparse
from zoneinfo import ZoneInfo

from runway_media import publish_runway_media
from contest_share import contest_share_pages, trend_share_page, runway_share_pages

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "dist"
if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir()

shutil.copyfile(ROOT / "member-entry.js", OUT / "member-entry.js")
share_page_version = sha256(b"".join((ROOT / name).read_bytes() for name in ("scripts/contest_share.py", "scripts/contest_poster.py", "contest-countries.json"))).hexdigest()[:10]
community_js = (ROOT / "community.js").read_text(encoding="utf-8")
contest_regions = json.loads((ROOT / "contest-regions.json").read_text())
contest_countries = json.loads((ROOT / "contest-countries.json").read_text())
community_js = community_js.replace("/* CONTEST_COUNTRIES */ {}", json.dumps(contest_countries, ensure_ascii=False))
community_js = community_js.replace("/* CONTEST_REGIONS */ {}", json.dumps(contest_regions))
community_js = community_js.replace('sharePageVersion="current"', f'sharePageVersion="{share_page_version}"')
(OUT / "community.js").write_text(community_js, encoding="utf-8")
shutil.copyfile(ROOT / "photo-viewer.js", OUT / "photo-viewer.js")
shutil.copyfile(ROOT / "public" / "favicon.svg", OUT / "favicon.svg")
for verification_file in (ROOT / "public").glob("MP_verify_*.txt"):
    if re.fullmatch(r"MP_verify_[A-Za-z0-9]+\.txt", verification_file.name) and verification_file.is_file():
        shutil.copyfile(verification_file, OUT / verification_file.name)
shutil.copytree(ROOT / "public" / "fonts", OUT / "fonts")
css = (ROOT / "app" / "globals.css").read_text(encoding="utf-8")
(OUT / "site.css").write_text(css.replace("../public/fonts/", "./fonts/"), encoding="utf-8")
(OUT / ".nojekyll").touch()

def versioned(name):
    return name + "?v=" + sha256((OUT / name).read_bytes()).hexdigest()[:10]

def fingerprinted(name):
    path = OUT / name
    fingerprint = sha256(path.read_bytes()).hexdigest()[:10]
    target = path.with_name(f"{path.stem}.{fingerprint}{path.suffix}")
    shutil.copyfile(path, target)
    return target.name

today = datetime.now(ZoneInfo("Asia/Seoul")).date()
minimum_season = (today.year - 1, 1) if today.month <= 2 else (today.year, int(today.month >= 9))
season_pattern = re.compile(r"(20\d{2})(?:/(?:20)?\d{2})?\s*(春夏|秋冬)")
calendar_year = re.compile(r"(?<![0-9])20[0-9]{2}(?![0-9])")

def current_season(label):
    seasons = season_pattern.findall(label)
    return bool(seasons) and all((int(year), int(term == "秋冬")) >= minimum_season for year, term in seasons)

def current_photo(row):
    descriptions = " ".join(row[key] for key in ("alt", "caption", "sourceUrl") if key in row)
    years = calendar_year.findall(unquote(descriptions))
    return bool(years) and all(int(year) >= minimum_season[0] for year in years)


def source(row):
    title, url = row["title"], row["url"]
    parsed = urlparse(url)
    if (not isinstance(title, str) or not title.strip() or parsed.scheme != "https" or not parsed.hostname
            or parsed.username or parsed.password
            or re.search(r"\.(?:jpg|jpeg|png|gif|webp|avif|svg|zip)$", parsed.path, re.I)):
        raise ValueError("Public sources must point to HTTPS editorial pages")
    return {"title": title, "url": url}

def public_trend(row):
    summary = {key: row[key] for key in ("id", "category", "date", "season", "kind", "title", "description", "application")
               if isinstance(row.get(key), str)}
    if not all(summary.get(k) for k in ("id", "title", "description")):
        raise ValueError("Public trend missing title, ID or description")
    summary["palette"] = [{"name": item["name"], "hex": item["hex"]} for item in row.get("palette", [])
                          if isinstance(item.get("name"), str) and re.fullmatch(r"#[a-fA-F0-9]{6}", item.get("hex", ""))]
    summary["sources"] = [source(item) for item in row.get("sources", [])]
    return summary

edition = json.loads((ROOT / "weekly-editorial.json").read_text(encoding="utf-8"))
if date.fromisoformat(edition["week"]).weekday() != 0:
    raise ValueError("The weekly edition is keyed to Monday")
headlines = [{"title": item["title"], "summary": item["summary"], "source": source(item["source"])}
             for item in edition["headlines"]]
if len(headlines) > 4 or any(not isinstance(item[k], str) or not item[k].strip() for item in headlines for k in ("title", "summary")):
    raise ValueError("Invalid public headlines")
(OUT / "weekly-editorial.json").write_text(json.dumps({"week": edition["week"], "headlines": headlines,
    "trends": [public_trend(item) for item in edition.get("trends", []) if current_season(item.get("season", ""))]}, ensure_ascii=False), encoding="utf-8")

cipher_fields = {"id", "nonce", "tag", "key", "body"}
article_fields = {"slug", "date", "season", "category", "title"}
cover_fields = {"url", "alt", "credit", "license", "licenseUrl", "sourceUrl"}
def encrypted_feed(filename, public_metadata=frozenset(), optional_metadata=frozenset()):
    rows = json.loads((ROOT / filename).read_text(encoding="utf-8"))
    ids = set()
    for row in rows:
        required = cipher_fields | public_metadata
        if (set(row) - optional_metadata != required
                or not re.fullmatch(r"[0-9a-f]{64}", row["id"]) or row["id"] in ids
                or any(not re.fullmatch(r"[A-Za-z0-9_-]+", row[field]) for field in ("nonce", "tag", "key", "body"))):
            raise ValueError(f"{filename} must only contain encrypted entries and catalog fields")
        ids.add(row["id"])
    write_json(OUT / filename, [{key: value for key, value in row.items() if key != "public"} for row in rows])
    return rows

def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

def texts(row, keys):
    fields = {key: row[key] for key in keys}
    if any(not isinstance(value, str) or not value.strip() for value in fields.values()):
        raise ValueError("Invalid public editorial text")
    return fields

def editorial_slug(row, namespace):
    slug = row["slug"]
    if not re.fullmatch(r"[a-z0-9-]{1,100}", slug) or sha256(f"{namespace}:{slug}".encode()).hexdigest() != row["id"]:
        raise ValueError("Invalid public editorial slug")
    return slug

def verified_photo_origin(image, original):
    if image.netloc in {"thumb.wikimedia.org", "upload.wikimedia.org"}:
        return original.netloc == "commons.wikimedia.org" and original.path.startswith("/wiki/File:")
    photo = re.fullmatch(r"/photos/[\w.@-]+/(\d+)/?", original.path, flags=re.ASCII)
    return (image.netloc == "live.staticflickr.com" and original.netloc == "www.flickr.com"
            and photo and image.path.rsplit("/", 1)[-1].startswith(photo[1] + "_"))

def cover_image(value):
    cover = texts(value, sorted(cover_fields))
    image, original, license_url = (urlparse(cover[key]) for key in ("url", "sourceUrl", "licenseUrl"))
    if (any(url.scheme != "https" or url.username or url.password for url in (image, original, license_url))
            or not verified_photo_origin(image, original)
            or license_url.netloc != "creativecommons.org"
            or not re.fullmatch(r"/(?:licenses/by(?:-sa)?/(?:2\.0|2\.5|3\.0|4\.0)|publicdomain/(?:zero|mark)/1\.0)/", license_url.path)):
        raise ValueError("Invalid trend cover source or license")
    return cover

def contest_entry(row):
    data = row["public"]
    entry = texts(data, ("kind", "title", "category", "organizer", "summary"))
    entry["id"] = editorial_slug(row, "contest")
    region = data.get("region", contest_regions.get(entry["id"]))
    if region in ("domestic", "overseas"):
        entry["region"] = region
    country = data.get("country") or contest_countries.get(entry["id"])
    if region == "overseas" and country:
        title = re.sub(r"^" + re.escape(country) + r"\s*[｜|]\s*", "", entry["title"])
        if re.fullmatch(r"World of WearableArt 20[0-9]{2}", title):
            title = "世界可穿戴艺术大赛 · " + title
        entry["title"] = f"【{country}】{title}"
    if entry["kind"] == "recruit":
        entry["deadline"] = date.fromisoformat(data["deadline"]).isoformat()
    elif entry["kind"] == "award" and re.fullmatch(r"20\d{2}(?:-\d{2}(?:-\d{2})?)?", data["date"]):
        entry["date"] = data["date"]
    else:
        raise ValueError("Invalid contest kind or date")
    entry["source"] = source(data["source"])
    entry["details"] = [texts(section, ("title", "text")) for section in data.get("details", [])]
    entry["references"] = [source(reference) for reference in data.get("references", [])]
    award = contest_awards.get(entry["id"])
    if award:
        entry["details"][:0] = [{"title": "奖项设置", "text": award["awards"]},
                                {"title": "赛事奖金", "text": award["prize"]}]
        if award.get("eligibility"):
            entry["details"] = [d for d in entry["details"] if not (d["title"] == "参赛资格" and d["text"] == award["eligibility"])]
            for detail in entry["details"]:
                if detail["title"] == "参赛资格":
                    detail["title"] = "资格细则"
            entry["details"].insert(0, {"title": "参赛资格", "text": award["eligibility"]})
        ref = source({"title": "奖项与奖金依据", "url": award["url"]})
        if ref["url"] not in {r["url"] for r in [entry["source"], *entry["references"]]}:
            entry["references"].append(ref)
    return entry

historical_palettes = {
  "ss27-white-shirt-colour-area": [
    {
      "label": "白衬衫",
      "brand": "RE RHEE",
      "hex": "#C2CDDD",
      "tcx": "14-4112",
      "name": "Skyway"
    },
    {
      "label": "灰绿领饰",
      "brand": "RE RHEE",
      "hex": "#546661",
      "tcx": "18-5611",
      "name": "Dark Forest"
    },
    {
      "label": "深灰长裤",
      "brand": "RE RHEE",
      "hex": "#667597",
      "tcx": "17-4020",
      "name": "Blue Shadow"
    }
  ],
  "rerhee-ss27-sand-tailoring-white-break": [
    {
      "label": "沙色外套",
      "brand": "RE RHEE",
      "hex": "#BABBA8",
      "tcx": "14-0000",
      "name": "Silver Gray"
    },
    {
      "label": "象牙色内搭",
      "brand": "RE RHEE",
      "hex": "#EFF6EF",
      "tcx": "11-4201",
      "name": "Cloud Dancer"
    }
  ],
  "rerhee-ss27-wine-red-white-boot": [
    {
      "label": "酒红裙装",
      "brand": "RE RHEE",
      "hex": "#342129",
      "tcx": "19-2118",
      "name": "Winetasting"
    },
    {
      "label": "浅色短靴",
      "brand": "RE RHEE",
      "hex": "#D7EAE5",
      "tcx": "11-4201",
      "name": "Cloud Dancer"
    }
  ],
  "rerhee-ss27-sage-tailoring": [
    {
      "label": "灰绿西装",
      "brand": "RE RHEE",
      "hex": "#7D897F",
      "tcx": "17-6009",
      "name": "Laurel Wreath"
    },
    {
      "label": "灰绿长裤",
      "brand": "RE RHEE",
      "hex": "#7C8A7E",
      "tcx": "16-5808",
      "name": "Iceberg Green"
    }
  ],
  "fw26-tonal-black-surface-and-closures": [
    {
      "label": "黑色长裙",
      "brand": "Rick Owens",
      "hex": "#474745",
      "tcx": "19-4205",
      "name": "Phantom"
    },
    {
      "label": "灰色褶片",
      "brand": "Yohji Yamamoto",
      "hex": "#7A8787",
      "tcx": "16-5106",
      "name": "Blue Surf"
    }
  ],
  "ss27-brown-jackets-cool-pairings": [
    {
      "label": "棕色夹克",
      "brand": "Brunello Cucinelli",
      "hex": "#A66433",
      "tcx": "18-1244",
      "name": "Ginger Bread"
    },
    {
      "label": "灰色长裤",
      "brand": "Brunello Cucinelli",
      "hex": "#5C5C65",
      "tcx": "18-3910",
      "name": "Folkstone Gray"
    }
  ],
  "ss27-blue-shirt-jacket-contrast": [
    {
      "label": "浅蓝长裤",
      "brand": "Lemaire",
      "hex": "#CCDBE2",
      "tcx": "14-4112",
      "name": "Skyway"
    },
    {
      "label": "海军蓝外套",
      "brand": "Brunello Cucinelli",
      "hex": "#252239",
      "tcx": "19-4024",
      "name": "Dress Blues"
    }
  ],
  "ss27-silver-black-light-placement": [
    {
      "label": "银灰衣身",
      "brand": "RE RHEE",
      "hex": "#C5CBBE",
      "tcx": "14-5002",
      "name": "Silver"
    },
    {
      "label": "银灰褶影",
      "brand": "RE RHEE",
      "hex": "#7B827B",
      "tcx": "17-0510",
      "name": "Silver Sage"
    }
  ],
  "ss27-pink-burgundy-value": [
    {
      "label": "柔粉造型",
      "brand": "PRONOUNCE",
      "hex": "#A67170",
      "tcx": "18-1612",
      "name": "Rose Taupe"
    },
    {
      "label": "酒红裙装",
      "brand": "RE RHEE",
      "hex": "#342129",
      "tcx": "19-2118",
      "name": "Winetasting"
    }
  ]
}


def trend_entry(data, metadata):
    entry = {**metadata, **texts(data, ("lead",))}
    colors = data.get("palette") or historical_palettes.get(metadata["slug"], [])
    if colors:
        entry["palette"] = [texts(color, ("label", "brand", "hex", "tcx", "name")) for color in colors]
        for color in entry["palette"]:
            if not re.fullmatch(r"#[0-9a-fA-F]{6}", color["hex"]) or not re.fullmatch(r"\d{2}-\d{4}", color["tcx"]):
                raise ValueError("Invalid trend color reference")
    study = ROOT / "public" / "colour-studies" / (metadata["slug"] + ".jpg")
    if colors and study.is_file():
        destination = OUT / "colour-studies" / study.name
        destination.parent.mkdir(exist_ok=True)
        shutil.copyfile(study, destination)
        entry["colourStudy"] = "/colour-studies/" + study.name
    entry["sections"] = []
    for section in data["sections"]:
        paragraphs = section["paragraphs"]
        if not isinstance(paragraphs, list) or not paragraphs or any(not isinstance(p, str) or not p.strip() for p in paragraphs):
            raise ValueError("Invalid public trend section")
        part = {**texts(section, ("heading",)), "paragraphs": paragraphs}
        if section.get("references"):
            part["references"] = [source(reference) for reference in section["references"]]
        if section.get("looks"):
            part["looks"] = []
            for look in section["looks"]:
                item = texts(look, ("url", "label", "gallery", "credit"))
                source({"title": item["label"], "url": item["gallery"]})
                photo = urlparse(item["url"])
                paragraph = look["paragraph"]
                if photo.scheme != "https" or photo.username or photo.password or type(paragraph) is not int or not 0 <= paragraph < len(paragraphs):
                    raise ValueError("Invalid inline runway photograph")
                part["looks"].append({**item, "paragraph": paragraph})
        entry["sections"].append(part)
    entry["images"] = [{**cover_image(row), **texts(row, ("caption",))} for row in data["images"] if current_photo(row)]
    entry["sources"] = [source(row) for row in data["sources"]]
    return entry

history_rows = encrypted_feed("history-feed.json", optional_metadata={"public"})
reader_dir = OUT / "collection-reader"
shutil.copytree(ROOT / "public" / "collection-reader", reader_dir)
with gzip.open(ROOT / "collection-catalog.json.gz", "rt", encoding="utf-8") as stream:
    collection = json.load(stream)
catalog = collection["archive"]
galleries = collection["galleries"]
known = {study["slug"] for study in catalog["studies"]}
for row in history_rows:
    if "public" not in row:
        continue
    study = row["public"]["study"]
    slug = study["slug"]
    if not re.fullmatch(r"[a-z0-9-]{1,100}", slug) or sha256(slug.encode()).hexdigest() != row["id"]:
        raise ValueError("Invalid collection slug")
    if slug not in known:
        catalog["studies"].append(study)
        known.add(slug)
    if row["public"].get("gallery"):
        galleries[study["date"] + "-" + slug] = row["public"]["gallery"]
catalog["studies"].sort(key=lambda study: study["date"], reverse=True)
write_json(reader_dir / "catalog.json", catalog)
(reader_dir / "galleries").mkdir()
for key, gallery in galleries.items():
    if not re.fullmatch(r"[a-z0-9-]{1,115}", key):
        raise ValueError("Invalid gallery key")
    write_json(reader_dir / "galleries" / (key + ".json"), gallery)
publish_runway_media(ROOT, OUT, catalog, galleries)
shutil.copytree(ROOT / "public" / "collections", OUT / "collections")
contests = encrypted_feed("contest-feed.json", {"slug"}, {"public"})
contest_awards = json.loads((ROOT / "contest-awards.json").read_text(encoding="utf-8"))
public_contests = []
if contests and all("public" in row for row in contests):
    public_contests = [contest_entry(row) for row in contests]
    write_json(OUT / "public-contests.json", {"items": public_contests})
articles = encrypted_feed("trend-vault.json", article_fields, {"cover", "public"})
details_dir = OUT / "trend-detail"
details_dir.mkdir()
catalog = []
public_articles = []
for row in articles:
    slug = editorial_slug(row, "trend")
    if "public" not in row or not current_season(row["season"]):
        continue
    post = {key: row[key] for key in sorted(article_fields)}
    article = trend_entry(row["public"], post)
    if not article["images"]:
        continue
    write_json(details_dir / f"{slug}.json", article)
    post["description"] = article["lead"]
    post["cover"] = cover_image(article["images"][0])
    public_articles.append(article)
    catalog.append(post)
if len({row["slug"] for row in catalog}) != len(catalog):
    raise ValueError("Duplicate article slug")
catalog.sort(key=lambda row: row["date"], reverse=True)
write_json(OUT / "trend-articles.json", catalog)

catalog_by_slug = {row["slug"]: row for row in catalog}
cover_edits = json.loads((ROOT / "home-runway.json").read_text(encoding="utf-8"))
home_runways = []
for row in cover_edits:
    if row["slug"] not in catalog_by_slug or not current_season(row["season"]):
        continue
    images = [{**cover_image(photo), **texts(photo, ("caption",))} for photo in row["images"] if current_photo(photo)]
    if images:
        home_runways.append({**texts(row, ("slug", "brand", "season", "reason")), "images": images})
manual_date = max((catalog_by_slug[row["slug"]]["date"] for row in home_runways), default="")
for row in catalog:
    if row["date"] <= manual_date:
        break
    if row.get("cover"):
        article = json.loads((details_dir / f'{row["slug"]}.json').read_text(encoding="utf-8"))
        home_runways.insert(0, {"slug": row["slug"], "brand": row["title"], "season": row["season"],
            "reason": article["lead"], "images": article["images"][:2]})
        break
write_json(OUT / "home-runway.json", home_runways)

brand_preview = json.loads((ROOT / "brand-preview.json").read_text(encoding="utf-8"))
if current_season(brand_preview["season"]) and current_photo(brand_preview["image"]):
    brand_preview = {
        **texts(brand_preview, ("brand", "collection", "season", "city", "headline", "intro", "note")),
        "source": source(brand_preview["source"]),
        "image": {**cover_image(brand_preview["image"]), **texts(brand_preview["image"], ("caption",))},
    }
else:
    brand_preview = None
write_json(OUT / "brand-preview.json", brand_preview)


entry_js = (OUT / "member-entry.js").read_text(encoding="utf-8")
runway_script = reader_dir / "runways.js"
runway_version = sha256((reader_dir / "catalog.json").read_bytes() + (ROOT / "runway-films.json").read_bytes())
runway_version.update((ROOT / "runway-brand-links.json").read_bytes())
for media_file in sorted((ROOT / "data" / "runway-galleries").glob("*.json.gz")):
    runway_version.update(media_file.read_bytes())
runway_script.write_text(runway_script.read_text().replace("RUNWAY_DATA_VERSION", runway_version.hexdigest()[:12]))
entry_js = entry_js.replace('"/collection-reader/runways.js"', '"/' + versioned("collection-reader/runways.js") + '"')
for module in ("community.js", "photo-viewer.js"):
    entry_js = entry_js.replace(f'"./{module}"', f'"./{fingerprinted(module)}"')
if public_contests:
    entry_js = entry_js.replace("./public-contests.json", "/" + versioned("public-contests.json"))
entry_js = entry_js.replace("trend-articles.json?view=current", versioned("trend-articles.json"))
issue_version = sha256((OUT / "trend-vault.json").read_bytes() + (OUT / "trend-articles.json").read_bytes()).hexdigest()[:10]
entry_js = entry_js.replace('slug + ".json?view=current"', 'slug + ".json?v=' + issue_version + '"')
(OUT / "member-entry.js").write_text(entry_js, encoding="utf-8")
shell = (ROOT / "member-shell.html").read_text(encoding="utf-8")
entry_module = fingerprinted("member-entry.js")
for asset in ("site.css", "favicon.svg"):
    shell = shell.replace(f'./{asset}"', f'./{versioned(asset)}"')
shell = shell.replace('./member-entry.js"', f'./{entry_module}"')
(OUT / "index.html").write_text(shell, encoding="utf-8")

stylesheet = versioned("site.css")
if public_contests:
    contest_share_pages(OUT, ROOT / "public", public_contests, stylesheet, entry_module, share_page_version)
for article in public_articles:
    trend_share_page(OUT, article, stylesheet, entry_module, share_page_version)

runway_share_pages(OUT, json.loads((reader_dir / "shows.json").read_text()), stylesheet, entry_module, share_page_version)
