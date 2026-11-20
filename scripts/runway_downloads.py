"""Build same-origin ZIP downloads so image-host CORS settings do not affect visitors."""
import concurrent.futures
import hashlib
import json
import shutil
import time
import urllib.request
import zipfile
from pathlib import Path

from PIL import Image
from io import BytesIO

ROOT = Path(__file__).resolve().parents[1]
READER = ROOT / "dist" / "collection-reader"
CACHE = ROOT / ".runway-download-cache"
OUTPUT = READER / "downloads"


def fetch_picture(look):
    for url in dict.fromkeys(filter(None, (look["url"], look.get("thumbnailUrl")))):
        for attempt in range(2):
            try:
                request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "image/*"})
                with urllib.request.urlopen(request, timeout=15) as response:
                    data = response.read()
                with Image.open(BytesIO(data)) as image:
                    ext = image.format.lower()
                    image.verify()
                return ("jpg" if ext == "jpeg" else ext), data
            except (OSError, ValueError, SyntaxError):
                if attempt == 0:
                    time.sleep(0.3)
    return None


def package(path, executor):
    show = json.loads(path.read_text())
    looks = show["images"]
    if not looks:
        return
    slug = show["slug"]
    signature = hashlib.sha256(json.dumps([looks, show["credit"], show["source"]], sort_keys=True).encode()).hexdigest()[:16]
    cached = CACHE / f"{slug}-{signature}.zip"
    dest = OUTPUT / f"{slug}.zip"
    count = len(looks)
    if cached.exists():
        shutil.copyfile(cached, dest)
    else:
        failures = []
        with zipfile.ZipFile(dest, "w") as archive:
            for i, result in enumerate(executor.map(fetch_picture, looks), 1):
                if result:
                    ext, data = result
                    archive.writestr(f"{i:03}-Look-{looks[i-1].get('number') or i}.{ext}", data)
                else:
                    failures.append(str(i))
            notes = [show['brand'], show['season'], show['credit'], show['source']]
            if failures:
                notes.append("未收录的图片序号：" + "、".join(failures))
            archive.writestr("图片来源.txt", "\n".join(filter(None, notes)))
        count -= len(failures)
        if not failures:
            shutil.copyfile(dest, cached)
    if count:
        show["download"] = {"url": "/collection-reader/downloads/" + dest.name, "count": count}
        path.write_text(json.dumps(show, ensure_ascii=False, separators=(",", ":")))
    else:
        dest.unlink()
    print(f"{slug}: {count}/{len(looks)}", flush=True)


if __name__ == "__main__":
    OUTPUT.mkdir(exist_ok=True)
    CACHE.mkdir(exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as executor:
        for path in sorted((READER / "shows").glob("*.json")):
            package(path, executor)
