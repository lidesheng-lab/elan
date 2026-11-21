"""Build public, crawlable cards for ÉLAN editorial sharing."""
from html import escape
from shutil import copytree
import json
import re
from contest_poster import poster

SITE = "https://elan.lidesheng.art"
LABELS = {"recruit": "赛事征稿", "award": "获奖公示"}
TOPICS = {"color": "色彩趋势", "fabric": "面料趋势", "silhouette": "廓形趋势"}


def page(out, section, slug, title, label, summary, image, css, entry_module, share_version, credit=""):
    path = out / section / slug
    path.mkdir(parents=True, exist_ok=True)
    url = f"{SITE}/{section}/{slug}/"
    e = lambda s: escape(s, quote=True)
    payload = json.dumps(dict(title=title, desc=summary, link=url, imgUrl=image),ensure_ascii=False).replace("<", r"\u003c")
    name = {"contests": "赛事", "trends": "文章", "designers": "秀场"}[section]
    reader_url = f"/{section}/{slug}/?v={share_version}"
    detail_route = f"{section}/{slug}"
    path.joinpath("index.html").write_text(f'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<base href="/">
<title>{e(title)}｜ÉLAN</title><link rel="canonical" href="{url}"><meta name="description" content="{e(summary)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="ÉLAN">
<meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(summary)}">
<meta property="og:url" content="{url}"><meta property="og:image" content="{e(image)}"><meta property="og:image:secure_url" content="{e(image)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{e(title)}"><meta name="twitter:image" content="{e(image)}">
<meta itemprop="name" content="{e(title)}"><meta itemprop="image" content="{e(image)}"><link rel="image_src" href="{e(image)}">
<link rel="stylesheet" href="/{e(css)}"><style>.share-preview{{max-width:760px;margin:5vh auto;padding:0 20px 6vh}}.share-preview img{{display:block;width:min(100%,360px);height:auto}}.share-preview h1{{font-size:clamp(2rem,6vw,4rem);line-height:1.15}}.share-preview p{{line-height:1.65}}.share-preview nav{{display:flex;gap:1.3rem;flex-wrap:wrap}}</style></head>
<body><div id="root" data-detail-route="{detail_route}"><main class="share-preview"><a href="/">ÉLAN</a>
<p id="wxhint" hidden>发朋友圈：点微信右上角「···」→「在浏览器打开」，再点「分享」。</p>
<p>{e(label)}</p><h1>{e(title)}</h1>
<img src="{e(image)}" alt="{e(title)}" fetchpriority="high">{credit}<p>{e(summary)}</p>
<nav><a class="primary" id="open-reader" hidden href="{e(reader_url)}">查看{name}全文</a>
<button type="button" class="member-secondary" id="copy-link" hidden>复制分享链接</button>
<a href="{e(image)}" {'download' if section=='contests' else ''}>打开分享封面</a></nav>
<input type="url" id="share-link" aria-label="分享链接" value="{url}" readonly hidden>
<p id="share-status" role="status"></p>
</main></div>
<script type="application/json" id="share-data">{payload}</script>
<script>
const shareOnly = new URLSearchParams(location.search).get("share") === "1";
if (shareOnly) {{
  document.getElementById("open-reader").hidden = false;
}} else {{
  const script = document.createElement("script");
  script.type = "module";
  script.src = "/{e(entry_module)}";
  document.head.append(script);
}}
const copyLink = document.getElementById("copy-link");
copyLink.hidden = false;
copyLink.addEventListener("click", async () => {{
  const field = document.getElementById("share-link");
  const status = document.getElementById("share-status");
  try {{
    await navigator.clipboard.writeText(field.value);
    status.textContent = "链接已复制。";
  }} catch {{
    field.hidden = false;
    field.select();
    status.textContent = "请长按已选中的链接复制。";
  }}
}});
if (/MicroMessenger/i.test(navigator.userAgent)) {{
  const wxHint = document.getElementById("wxhint");
  wxHint.hidden=false;
  const data=JSON.parse(document.getElementById("share-data").textContent);
  const sdk=document.createElement("script");
  sdk.src="https://res.wx.qq.com/open/js/jweixin-1.6.0.js";
  sdk.onload=async()=>{{
    try {{
      const endpoint="https://elan-d8gtdxsaw5a7788d2-1507516836.ap-shanghai.app.tcloudbase.com/wechat-share";
      const res=await fetch(endpoint+"?url="+encodeURIComponent(location.href.split("#")[0]));
      if(!res.ok)return;
      const config=await res.json();
      wx.ready(()=>{{
        wx.updateTimelineShareData({{...data, success:()=>{{
          document.documentElement.dataset.timelineReady = "true";
          wxHint.textContent = "发朋友圈：点微信右上角「···」→「分享到朋友圈」→「发表」。";
        }}}});
        wx.updateAppMessageShareData(data);
      }});
      wx.config({{...config,debug:false,jsApiList:["updateTimelineShareData","updateAppMessageShareData"]}});
    }} catch {{ /* The visible cover can also be shared as an image. */ }}
  }};
  document.head.append(sdk);
}}
</script></body></html>''', encoding="utf-8")


def contest_share_pages(out, public_dir, contests, stylesheet, entry_module, share_version):
    copytree(public_dir / "share", out / "share", dirs_exist_ok=True)
    for item in contests:
        slug = item["id"]
        label = LABELS[item["kind"]]
        date = ("截稿  " + item["deadline"]) if item["kind"] == "recruit" else ("获奖公布  " + item["date"])
        path = out / "contests" / slug
        path.mkdir(parents=True, exist_ok=True)
        title = item["title"]
        if re.fullmatch(r"World of WearableArt 20[0-9]{2}", title):
            title = "新西兰世界可穿戴艺术大赛 · " + title
        poster(path / "cover.jpg", item, title, label, date)
        page(out, "contests", slug, title, label, item["summary"],
             f"{SITE}/contests/{slug}/cover.jpg?v={share_version}", stylesheet, entry_module, share_version)


def trend_share_page(out, article, stylesheet, entry_module, share_version):
    photo = article["images"][0]
    credit = '<small>' + escape(photo["credit"]) + ' · <a href="' + escape(photo["licenseUrl"],quote=True) + '">' + escape(photo["license"]) + '</a> · <a href="' + escape(photo["sourceUrl"],quote=True) + '">原图</a></small>'
    page(out, "trends", article["slug"], article["title"], TOPICS[article["category"]] + " · " + article["season"],
         article["lead"], photo["url"], stylesheet, entry_module, share_version, credit)


def runway_share_pages(out, shows, css, entry_module, share_version):
    from PIL import Image
    for show in shows:
        slug = show["slug"]
        directory = out / "designers" / slug
        directory.mkdir(parents=True, exist_ok=True)
        image = show["cover"]
        if image.startswith("/collection-reader/covers/"):
            with Image.open(out / image.lstrip("/")) as cover:
                cover.convert("RGB").save(directory / "cover.jpg", quality=88)
            image = f"{SITE}/designers/{slug}/cover.jpg"
        title = f'{show["brand"]} · {show["season"]}'
        page(out, "designers", slug, title, "秀场", f'{title}系列造型与秀场资料。', image, css, entry_module, share_version)
