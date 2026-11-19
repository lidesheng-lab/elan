"""Package the public ÉLAN pages without member archives or media."""
from pathlib import Path
from datetime import date
import json
import re
import shutil
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "dist"
if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir()
shutil.copyfile(ROOT / "member-shell.html", OUT / "index.html")
shutil.copyfile(ROOT / "member-entry.js", OUT / "member-entry.js")
shutil.copyfile(ROOT / "public" / "favicon.svg", OUT / "favicon.svg")
shutil.copytree(ROOT / "public" / "fonts", OUT / "fonts")
css = (ROOT / "app" / "globals.css").read_text(encoding="utf-8")
(OUT / "site.css").write_text(css.replace("../public/fonts/", "./fonts/"), encoding="utf-8")
(OUT / ".nojekyll").touch()

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

trends = json.loads((ROOT / "public-trends.json").read_text(encoding="utf-8"))
edition = json.loads((ROOT / "weekly-editorial.json").read_text(encoding="utf-8"))
if date.fromisoformat(edition["week"]).weekday() != 0:
    raise ValueError("The weekly edition is keyed to Monday")
headlines = [{"title": item["title"], "summary": item["summary"], "source": source(item["source"])}
             for item in edition["headlines"]]
if len(headlines) > 4 or any(not isinstance(item[k], str) or not item[k].strip() for item in headlines for k in ("title", "summary")):
    raise ValueError("Invalid public headlines")
(OUT / "public-trends.json").write_text(json.dumps([public_trend(item) for item in trends], ensure_ascii=False), encoding="utf-8")
(OUT / "weekly-editorial.json").write_text(json.dumps({"week": edition["week"], "headlines": headlines,
    "trends": [public_trend(item) for item in edition.get("trends", [])]}, ensure_ascii=False), encoding="utf-8")

def article_photo(row):
    url = urlparse(row["url"])
    license_url = urlparse(row["licenseUrl"])
    photo_page = urlparse(row["sourceUrl"])
    if (url.scheme != "https" or url.netloc not in {"upload.wikimedia.org", "thumb.wikimedia.org"}
            or not re.search(r"\.(?:jpg|jpeg|png|webp)$", url.path, re.I)
            or photo_page.scheme != "https" or photo_page.netloc != "commons.wikimedia.org"
            or not photo_page.path.startswith("/wiki/File:") or not row["credit"]
            or license_url.scheme != "https" or license_url.netloc != "creativecommons.org"
            or not re.fullmatch(r"/(?:licenses/by(?:-sa)?/(?:2\.0|2\.5|3\.0|4\.0)|publicdomain/(?:zero|mark)/1\.0)/",
                                 license_url.path)):
        raise ValueError("Article images require verified Wikimedia media and an open license")
    return {key: row[key] for key in ("url", "alt", "caption", "credit", "sourceUrl", "license", "licenseUrl")}

def trend_article(row):
    if (not re.fullmatch(r"[a-z0-9-]{1,100}", row["slug"])
            or row["category"] not in {"color", "fabric", "silhouette"}
            or not row["title"] or not row["lead"] or not row["season"]
            or len(row["sections"]) < 2 or not row["images"] or not row["sources"]):
        raise ValueError("Trend articles need a unique slug, theme, copy, images and sources")
    date.fromisoformat(row["date"])
    sections = [{"heading": section["heading"], "paragraphs": section["paragraphs"]} for section in row["sections"]]
    return {key: row[key] for key in ("slug", "title", "lead", "date", "season", "category")} | {
        "sections": sections, "images": [article_photo(photo) for photo in row["images"]],
        "sources": [source(item) for item in row["sources"]],
    }

articles = [trend_article(json.loads(path.read_text(encoding="utf-8")))
            for path in sorted((ROOT / "trend-articles").glob("*.json"))]
if len({item["slug"] for item in articles}) != len(articles):
    raise ValueError("Duplicate trend article slugs")
articles.sort(key=lambda row: row["date"], reverse=True)
(OUT / "trend-articles.json").write_text(json.dumps(articles, ensure_ascii=False), encoding="utf-8")

history = json.loads((ROOT / "history-feed.json").read_text(encoding="utf-8"))
ids = set()
for row in history:
    if (set(row) != {"id", "nonce", "tag", "key", "body"}
            or not re.fullmatch(r"[0-9a-f]{64}", row["id"]) or row["id"] in ids
            or any(not re.fullmatch(r"[A-Za-z0-9_-]+", row[field]) for field in ("nonce", "tag", "key", "body"))):
        raise ValueError("The historical feed must only contain encrypted entries")
    ids.add(row["id"])
(OUT / "history-feed.json").write_text(json.dumps(history, separators=(",", ":")), encoding="utf-8")
