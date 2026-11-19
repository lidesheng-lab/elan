"""Package the public ÉLAN pages without member archives or media."""
from pathlib import Path
from datetime import date, datetime
from hashlib import sha256
import json
import re
import shutil
from urllib.parse import unquote, urlparse
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "dist"
if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir()

shutil.copyfile(ROOT / "member-entry.js", OUT / "member-entry.js")
shutil.copyfile(ROOT / "community.js", OUT / "community.js")
shutil.copyfile(ROOT / "photo-viewer.js", OUT / "photo-viewer.js")
shutil.copyfile(ROOT / "public" / "favicon.svg", OUT / "favicon.svg")
shutil.copytree(ROOT / "public" / "fonts", OUT / "fonts")
css = (ROOT / "app" / "globals.css").read_text(encoding="utf-8")
(OUT / "site.css").write_text(css.replace("../public/fonts/", "./fonts/"), encoding="utf-8")
(OUT / ".nojekyll").touch()

def versioned(name):
    return name + "?v=" + sha256((OUT / name).read_bytes()).hexdigest()[:10]

shell = (ROOT / "member-shell.html").read_text(encoding="utf-8")
for asset in ("site.css", "member-entry.js"):
    shell = shell.replace(f'./{asset}"', f'./{versioned(asset)}"')
(OUT / "index.html").write_text(shell, encoding="utf-8")

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

def cover_image(value):
    cover = texts(value, sorted(cover_fields))
    image, original, license_url = (urlparse(cover[key]) for key in ("url", "sourceUrl", "licenseUrl"))
    if (any(url.scheme != "https" or url.username or url.password for url in (image, original, license_url))
            or image.netloc not in {"thumb.wikimedia.org", "upload.wikimedia.org"}
            or original.netloc != "commons.wikimedia.org" or not original.path.startswith("/wiki/File:")
            or license_url.netloc != "creativecommons.org"
            or not re.fullmatch(r"/(?:licenses/by(?:-sa)?/(?:2\.0|2\.5|3\.0|4\.0)|publicdomain/(?:zero|mark)/1\.0)/", license_url.path)):
        raise ValueError("Invalid trend cover source or license")
    return cover

def contest_entry(row):
    data = row["public"]
    entry = texts(data, ("kind", "title", "category", "organizer", "summary"))
    entry["id"] = editorial_slug(row, "contest")
    if entry["kind"] == "recruit":
        entry["deadline"] = date.fromisoformat(data["deadline"]).isoformat()
    elif entry["kind"] == "award" and re.fullmatch(r"20\d{2}(?:-\d{2}(?:-\d{2})?)?", data["date"]):
        entry["date"] = data["date"]
    else:
        raise ValueError("Invalid contest kind or date")
    entry["source"] = source(data["source"])
    entry["details"] = [texts(section, ("title", "text")) for section in data.get("details", [])]
    entry["references"] = [source(reference) for reference in data.get("references", [])]
    return entry

def trend_entry(data, metadata):
    entry = {**metadata, **texts(data, ("lead",))}
    entry["sections"] = []
    for section in data["sections"]:
        paragraphs = section["paragraphs"]
        if not isinstance(paragraphs, list) or not paragraphs or any(not isinstance(p, str) or not p.strip() for p in paragraphs):
            raise ValueError("Invalid public trend section")
        entry["sections"].append({**texts(section, ("heading",)), "paragraphs": paragraphs})
    entry["images"] = [{**cover_image(row), **texts(row, ("caption",))} for row in data["images"] if current_photo(row)]
    entry["sources"] = [source(row) for row in data["sources"]]
    return entry

encrypted_feed("history-feed.json")
contests = encrypted_feed("contest-feed.json", {"slug"}, {"public"})
if contests and all("public" in row for row in contests):
    write_json(OUT / "public-contests.json", {"items": [contest_entry(row) for row in contests]})
articles = encrypted_feed("trend-vault.json", article_fields, {"cover", "public"})
details_dir = OUT / "trend-detail"
details_dir.mkdir()
catalog = []
for row in articles:
    slug = editorial_slug(row, "trend")
    if "public" not in row or not current_season(row["season"]):
        continue
    post = {key: row[key] for key in sorted(article_fields)}
    article = trend_entry(row["public"], post)
    write_json(details_dir / f"{slug}.json", article)
    if article["images"]:
        post["cover"] = cover_image(article["images"][0])
    catalog.append(post)
if len({row["slug"] for row in catalog}) != len(catalog):
    raise ValueError("Duplicate article slug")
catalog.sort(key=lambda row: (row["date"], "cover" in row), reverse=True)
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
