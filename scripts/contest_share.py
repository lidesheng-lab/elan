"""Render public competition links that can be previewed without JavaScript."""
from html import escape
from shutil import copyfile


SITE_URL = "https://elan.lidesheng.art"
LABELS = {"recruit": "赛事征稿", "award": "获奖公示"}


def contest_share_pages(out, public_dir, contests, stylesheet):
    covers = out / "share"
    covers.mkdir(exist_ok=True)
    for kind in LABELS:
        name = f"contest-{kind}.jpg"
        copyfile(public_dir / "share" / name, covers / name)

    for contest in contests:
        path = out / "contests" / contest["id"]
        path.mkdir(parents=True, exist_ok=True)
        path.joinpath("index.html").write_text(
            contest_share_html(contest, stylesheet), encoding="utf-8"
        )


def contest_share_html(contest, stylesheet):
    slug = contest["id"]
    kind = contest["kind"]
    title = escape(contest["title"])
    summary = escape(contest["summary"])
    organizer = escape(contest["organizer"])
    category = escape(contest["category"])
    label = LABELS[kind]
    date_label = "截稿日期" if kind == "recruit" else "结果日期"
    date = escape(contest.get("deadline") or contest["date"])
    url = f"{SITE_URL}/contests/{slug}/"
    detail = f"/#contests/{slug}"
    image = f"{SITE_URL}/share/contest-{kind}.jpg"
    image_alt = f"ÉLAN 服装设计大赛 · {label}"
    return f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}｜ÉLAN</title>
  <meta name="description" content="{summary}">
  <link rel="canonical" href="{url}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="ÉLAN">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{summary}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{image}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="600">
  <meta property="og:image:height" content="600">
  <meta property="og:image:alt" content="{image_alt}">
  <meta itemprop="name" content="{title}">
  <meta itemprop="description" content="{summary}">
  <meta itemprop="image" content="{image}">
  <link rel="image_src" href="{image}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="{title}">
  <meta name="twitter:description" content="{summary}">
  <meta name="twitter:image" content="{image}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/{escape(stylesheet)}">
  <style>
    .share-masthead{{max-width:1120px;margin:0 auto;padding:16px 0;border-bottom:1px solid var(--line)}}
    .share-masthead a{{font:400 clamp(2.6rem,6vw,4rem)/1 var(--serif);color:var(--ink);text-decoration:none}}
    .share-layout{{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(0,1fr);align-items:start;
      gap:clamp(20px,6vw,72px);padding-top:clamp(18px,4vw,38px)}}
    .share-layout p{{line-height:1.65;overflow-wrap:anywhere}}
    .share-cover{{display:block;width:100%;max-width:330px;height:auto;justify-self:end}}
    .share-actions{{display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px;margin-top:22px}}
    @media(max-width:640px){{
      .share-layout{{grid-template-columns:minmax(0,1fr);gap:24px}}
      .share-cover{{justify-self:start;width:min(100%,240px)}}
    }}
  </style>
</head>
<body>
  <header class="share-masthead"><a href="/" aria-label="ÉLAN 首页">ÉLAN</a></header>
  <main class="community-page contest-page">
    <a class="reader-back" href="/#contests">← 服装设计大赛</a>
    <article class="contest-feature">
      <header class="contest-feature-header">
        <p class="eyebrow">{label} · {category}</p>
        <h1>{title}</h1>
      </header>
      <div class="share-layout">
        <div>
          <p class="contest-feature-lead">{summary}</p>
          <p class="community-meta">{organizer} · {date_label} {date}</p>
          <div class="share-actions">
            <a class="primary" href="{detail}">查看赛事详情</a>
            <a class="text-action" href="/share/contest-{kind}.jpg" download>保存分享封面</a>
          </div>
          <p class="community-meta" id="wechat-share-hint" hidden>点右上角「···」，选择分享到朋友圈。</p>
        </div>
        <img class="share-cover" src="{image}" alt="{image_alt}" width="600" height="600">
      </div>
    </article>
  </main>
  <script>
    if (/MicroMessenger/i.test(navigator.userAgent))
      document.getElementById("wechat-share-hint").hidden = false;
  </script>
</body>
</html>
"""
