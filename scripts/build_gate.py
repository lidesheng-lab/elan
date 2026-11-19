"""Package only the public membership entry and its design assets."""
from pathlib import Path
import shutil

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
