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

edition = json.loads((ROOT / "weekly-editorial.json").read_text(encoding="utf-8"))
if date.fromisoformat(edition["week"]).weekday() != 0:
    raise ValueError("The weekly edition is keyed to Monday")
headlines = [{"title": item["title"], "summary": item["summary"], "source": source(item["source"])}
             for item in edition["headlines"]]
if len(headlines) > 4 or any(not isinstance(item[k], str) or not item[k].strip() for item in headlines for k in ("title", "summary")):
    raise ValueError("Invalid public headlines")
(OUT / "weekly-editorial.json").write_text(json.dumps({"week": edition["week"], "headlines": headlines,
    "trends": [public_trend(item) for item in edition.get("trends", [])]}, ensure_ascii=False), encoding="utf-8")

cipher_fields = {"id", "nonce", "tag", "key", "body"}
article_fields = {"slug", "date", "season", "category", "title"}
def encrypted_feed(filename, public_metadata=frozenset()):
    rows = json.loads((ROOT / filename).read_text(encoding="utf-8"))
    ids = set()
    for row in rows:
        if (set(row) != cipher_fields | public_metadata
                or not re.fullmatch(r"[0-9a-f]{64}", row["id"]) or row["id"] in ids
                or any(not re.fullmatch(r"[A-Za-z0-9_-]+", row[field]) for field in ("nonce", "tag", "key", "body"))):
            raise ValueError(f"{filename} must only contain encrypted entries and catalog fields")
        ids.add(row["id"])
    (OUT / filename).write_text(json.dumps(rows, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return rows

encrypted_feed("history-feed.json")
articles = encrypted_feed("trend-vault.json", article_fields)
catalog = [{key: row[key] for key in sorted(article_fields)} for row in articles]
if len({row["slug"] for row in catalog}) != len(catalog):
    raise ValueError("Duplicate article slug")
catalog.sort(key=lambda row: row["date"], reverse=True)
(OUT / "trend-articles.json").write_text(json.dumps(catalog, ensure_ascii=False), encoding="utf-8")
