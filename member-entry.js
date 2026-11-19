import { enableMemberPhotoZoom, photoTrigger } from "./photo-viewer.js";
import { favoriteControl, shareControl, mountTrendDiscussion, renderProfile, renderContests, renderSquare, renderReviewQueue } from "./community.js";

const api = "https://elan-d8gtdxsaw5a7788d2-1507516836.ap-shanghai.app.tcloudbase.com/newsletter";
const storageKey = "elan-member-session";
const root = document.getElementById("root");
const sessionPattern = /^[A-Za-z0-9_-]{43}$/;
const setPasswordPattern = /^#set-password\/([a-f0-9]{64})\/([A-Za-z0-9_-]{43})$/;
let session = sessionStorage.getItem(storageKey) || "";
let account = null;
let surface = "public";
let pageHash = "#home";
const sections = [
  ["home", "首页"], ["designers", "品牌索引"], ["beauty", "美妆"], ["trends", "流行趋势"],
  ["contests", "服装设计大赛"], ["square", "设计广场"], ["studio", "线稿工作台"],
];
const lockedSections = new Set(["designers", "beauty", "studio"]);
const communityRoutes = new Map([
  ["profile",["个人中心",target=>renderProfile(target,request,logout)]],
  ["contests",["服装设计大赛",target=>renderContests(target,request,readPublicContests,Boolean(account),sectionDetail())]],
  ["square",["设计广场",target=>renderSquare(target,request,Boolean(account),sectionDetail())]],
]);
const accessRoutes = new Set(["login", "register", "reset", "subscribe"]);
const accessCopy = {
  login: ["会员登录", "使用注册邮箱和密码登录。"],
  register: ["注册普通会员", "验证邮箱并设置密码后，即可免费登录。"],
  reset: ["找回密码", "输入你的注册邮箱。"],
  subscribe: ["免费订阅", "每周收到时尚资讯与流行趋势。登记后请确认邮箱，也可通过邮件退订。"],
};
const categories = [["color", "色彩趋势"], ["fabric", "面料趋势"], ["silhouette", "廓形趋势"]];
const feeds = new Map();
const wantsAdmin = () => new URLSearchParams(location.search).get("panel")==="admin";
const sectionDetail = () => location.hash.slice(1).split("?")[0].split("/")[1] || "";
const visitorActions = new Set(["communityContestEngagement","communityPosts","communityThread","communityLike"]);
let visitorId;
let contestCatalog;

function visitorDevice() {
  if (visitorId) return visitorId;
  visitorId = crypto.randomUUID();
  try {
    const saved = localStorage.getItem("elan-visitor-reactions");
    if (saved && /^[a-f0-9-]{36}$/.test(saved)) visitorId = saved;
    else localStorage.setItem("elan-visitor-reactions",visitorId);
  } catch { /* Use the in-page identifier when storage is unavailable. */ }
  return visitorId;
}

async function request(body, signal, credentials = session) {
  const headers = { "Content-Type": "application/json" };
  if (credentials) headers.Authorization = "Bearer " + credentials;
  else if (visitorActions.has(body.memberAction)) body = {...body,device:visitorDevice()};
  const response = await fetch(api, { method: "POST", headers, body: JSON.stringify(body),
    signal: signal || AbortSignal.timeout(15000) });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error || "操作暂不可用，请稍后再试。"), { status: response.status });
  return result;
}

function panel(label, text, markup) {
  surface = "account";
  root.innerHTML = `<main class="member-entry">
    <p class="member-wordmark"><a href="/">ÉLAN</a></p>
    <section class="member-panel">
      <h1>${label}</h1><p>${text}</p>
      ${markup}
      <p class="member-message" role="status" id="member-message"></p>
    </section>
  </main>`;
}
function message(text) {
  const status = document.getElementById("access-message") || document.getElementById("member-message");
  if (status) status.textContent = text;
}
function bindForm(id, operation) {
  const form = document.getElementById(id);
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.submitter || form.querySelector("button");
    button.disabled = true;
    message("正在处理…");
    try { await operation(new FormData(form), button); }
    catch (error) { if (form.isConnected) message(error.message); }
    finally { button.disabled = false; }
  });
}
function accessForm(mode) {
  if (mode === "subscribe") return `
    <form id="access-form">
      <label for="member-email">订阅邮箱</label>
      <input id="member-email" name="email" type="email" autocomplete="email" placeholder="name@example.com" required maxlength="254">
      <button class="primary" type="submit">免费订阅</button>
    </form>`;
  const login = mode === "login";
  return `
    <form id="access-form">
      <label for="member-email">邮箱地址</label>
      <input id="member-email" name="email" type="email" autocomplete="username" required maxlength="254">
      ${login ? '<label for="member-password">密码</label><input id="member-password" name="password" type="password" autocomplete="current-password" required maxlength="512">' : ""}
      <button class="primary" type="submit">${login ? "登录" : mode === "register" ? "发送注册邮件" : "发送重置邮件"}</button>
    </form>
    <div class="access-actions">
      ${login ? '<p>还没有账号？ <a class="text-action" href="#register">注册普通会员</a></p><a class="text-action" href="#reset">忘记密码</a>'
        : '<a class="text-action" href="#login">返回登录</a>'}
    </div>`;
}
function showAccess(mode, trigger = document.activeElement) {
  let dialog = document.getElementById("member-access");
  const email = dialog?.querySelector("#member-email")?.value ?? "";
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "member-access";
    dialog.className = "access-dialog member-panel";
    dialog.setAttribute("aria-labelledby", "access-title");
    dialog.addEventListener("click", event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener("close", () => {
      if (!dialog.isConnected) return;
      dialog.remove();
      if (wantsAdmin() || accessRoutes.has(publicRoute())) history.replaceState(null, "", location.pathname + (wantsAdmin() ? "" : location.search) + pageHash);
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({preventScroll:true});
    });
    (surface === "member" ? document.body : root).append(dialog);
  }
  const [title, help] = accessCopy[mode];
  const subscribing = mode === "subscribe";
  dialog.innerHTML = `<button class="access-close" type="button" aria-label="${subscribing ? "关闭订阅窗口" : "关闭会员窗口"}"><span aria-hidden="true">×</span> 关闭</button>
    <h1 id="access-title" tabindex="-1" autofocus>${title}</h1><p>${help}</p>
    ${accessForm(mode)}<p class="member-message" role="status" id="access-message"></p>`;
  dialog.querySelector(".access-close").onclick = () => dialog.close();
  const address = dialog.querySelector("#member-email");
  address.value = subscribing ? account?.email || "" : email;
  address.readOnly = subscribing && Boolean(account?.premium);
  bindAccess(mode);
  if (!dialog.open) dialog.showModal();
  dialog.querySelector("#access-title").focus({preventScroll:true});
}
function bindAccess(mode) {
  const form = document.getElementById("access-form");
  bindForm("access-form", async data => {
    const email = data.get("email");
    if (mode === "subscribe") {
      const result = await request({ email }, undefined, "");
      if (!result.registered) throw new Error("暂时无法登记，请稍后再试。");
      if (!form.isConnected) return;
      form.remove();
      message("邮箱已登记。首次订阅请查收确认邮件。");
    } else if (mode === "login") {
      const result = await request({ memberAction: "passwordLogin", email, password: data.get("password") }, undefined, "");
      if (!form.isConnected) return;
      startSession(result.session);
      history.replaceState(null, "", wantsAdmin() ? "/?panel=admin" : "/" + (pageHash && pageHash !== "#home" ? pageHash : "#profile"));
      await loadMember();
    } else {
      await request({ memberAction: mode, email }, undefined, "");
      if (form.isConnected) message(mode === "register" ? "请查收注册邮件，验证邮箱并设置密码后即可登录。" : "如果邮箱已注册，请查收重置邮件。");
    }
  });
}
function lockedPreview(title, copy, action) {
  return `<section class="tier-locked">
    <div class="tier-blur" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="tier-lock-copy"><h2>${title}</h2><p>${copy}</p>${action || ""}</div>
  </section>`;
}
function preview(route) {
  if (route === "designers") return `<article class="tier-preview">
    <p class="eyebrow">品牌索引 · 2010 秋冬</p><h2>Y-3｜针织衣身怎样开合</h2>
    <p>Yohji Yamamoto 在纽约秀场用拉链调整针织裙和棉衬衫的轮廓。软布沿开口弯折，拉链让边缘在闭合时保持干净。</p>
    <img src="https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cb/Y-3_Fall-Winter_2010_226.jpg/960px-Y-3_Fall-Winter_2010_226.jpg" alt="Y-3 2010 秋冬纽约秀场现场" loading="lazy">
    <p class="eyebrow">Masaki-H · <a href="https://commons.wikimedia.org/wiki/File:Y-3_Fall-Winter_2010_226.jpg" target="_blank" rel="noreferrer">原图</a> · <a href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noreferrer">CC BY 2.0</a></p>
    <p>打样时先稳定拉链边，再比较开合状态下的摆量。用相同机位拍站姿和一步行走，更容易判断面料有没有被拉拽。</p>
  </article>`;
  if (route === "beauty") return `<article class="tier-preview">
    <p class="eyebrow">秀场美妆 · 2027 春夏</p><h2>Collina Strada｜薄底妆与局部珠光</h2>
    <p>化妆师 Francelle Daly 在上粉底前使用珠光妆前产品，把细小的反光留在底妆下。观察颧骨、鼻梁和眼角如何随着光线变化。</p>
    <p>拍摄可以从侧前方柔光开始，让高光落在颧骨和内眼角。鼻颊保留细小绒毛和皮肤纹理，衣料和皮肤的光泽更容易区分。</p>
    <p><a class="text-action" href="https://www.aol.com/articles/collina-strada-dreamy-nyfw-beauty-194148000.html" target="_blank" rel="noreferrer">阅读 ELLE 秀场报道</a></p>
  </article>`;
  return "";
}
function premiumLink() {
  return '<a class="primary" href="#upgrade">申请高级会员</a>';
}
function publicRoute() {
  const route = location.hash.slice(1).split("?")[0];
  if (/^trends\/[a-z0-9-]+$/.test(route)) return "trends";
  if (/^designers\/[a-z0-9-]+$/.test(route)) return "designers";
  if (/^contests\/[a-z0-9-]{1,110}$/.test(route)) return "contests";
  if (/^square\/[a-f0-9-]{36}$/.test(route)) return "square";
  return sections.some(([key]) => key === route) || accessRoutes.has(route) || communityRoutes.has(route) ||
    route === "upgrade" ? route : "home";
}
function articleLink(slug) { return "#trends/" + slug; }
function trendStory(post,featured) {
  const story=element("article",null,"trend-story"+(featured?" trend-story-featured":""));
  const open=element("a",null,"trend-story-link");
  open.href=articleLink(post.slug);
  open.setAttribute("aria-labelledby","story-"+post.slug);
  const frame=element("div",null,"trend-story-photo");
  function graphic() {
    frame.classList.add("trend-graphic", "trend-graphic-" + post.category);
    frame.setAttribute("aria-hidden", "true");
  }
  if(post.cover) {
    const img=element("img");
    img.src=post.cover.url;
    img.alt=post.cover.alt;
    img.title=post.cover.credit+" · "+post.cover.license;
    img.decoding="async";
    if(featured) img.fetchPriority="high";
    else img.loading="lazy";
    img.addEventListener("error",()=>{img.remove();graphic();},{once:true});
    frame.append(img);
  } else graphic();
  const copy=element("div",null,"trend-story-copy");
  const category=categories.find(([key])=>key===post.category)?.[1];
  const heading=element("h2",post.title);
  heading.id="story-"+post.slug;
  const time=element("time",post.date);
  time.dateTime=post.date;
  const season=element("p",null,"trend-story-meta");
  season.append(post.season," · ",time);
  copy.append(element("p",category,"eyebrow"),heading,season);
  open.append(frame,copy);
  story.append(open);
  return story;
}

function renderTrendArticle(output, post) {
  const article = element("article", null, "trend-feature");
  const back = element("a", "← 全部趋势文章", "text-action");
  back.href = "#trends";
  const date = element("time", post.date);
  date.dateTime = post.date;
  const meta = element("p", null, "eyebrow");
  meta.append(date, " · " + post.season + " · " + categories.find(([key]) => key === post.category)[1]);
  article.append(back, meta, element("h1", post.title), element("p", post.lead, "trend-feature-lead"));
  const actions = element("div", null, "community-actions");
  actions.append(favoriteControl(request,"trend",post.slug,Boolean(account)),
    shareControl(post.title,articleLink(post.slug),Boolean(account)));
  article.append(actions);
  const photos = element("div", null, "trend-feature-photos");
  for (const [index, photo] of post.images.entries()) {
    const figure = element("figure");
    const img = element("img");
    img.src = photo.url;
    img.alt = photo.alt;
    img.decoding = "async";
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    const caption = element("figcaption", photo.caption);
    figure.append(photoTrigger(img, post.images, index), caption);
    photos.append(figure);
  }
  if (photos.childElementCount) article.append(photos);
  for (const section of post.sections) {
    const part = element("section");
    part.append(element("h2", section.heading), ...section.paragraphs.map(copy => element("p", copy)));
    article.append(part);
  }
  const sources = element("footer", null, "trend-feature-sources");
  sources.append(element("h2", "秀场与资料来源"));
  for (const source of post.sources) addSource(sources, source);
  for (const photo of post.images) {
    const credit = element("p", photo.credit + " · ");
    addSource(credit, {title:"照片原页", url:photo.sourceUrl});
    credit.append(" · ");
    addSource(credit, {title:photo.license, url:photo.licenseUrl});
    sources.append(credit);
  }
  article.append(sources);
  const discussion = element("section", null, "trend-discussion");
  discussion.setAttribute("aria-label","文章评论");
  article.append(discussion);
  output.replaceChildren(article);
  void mountTrendDiscussion(discussion,request,post.slug,Boolean(account));
}
async function showTrendArticles(target) {
  const output = target.querySelector(".trend-articles");
  const slug = sectionDetail();
  try {
    if (slug) {
      const post = await feed("./trend-detail/" + slug + ".json", 5000);
      if (target.isConnected) renderTrendArticle(output, post);
      return;
    }
    const posts = await feed("./trend-articles.json?view=current");
    if (!target.isConnected) return;
    const dateChoice = target.querySelector("#trend-date");
    const categoryChoice = target.querySelector("#trend-article-category");
    const reset = target.querySelector("#trend-clear");
    for (const date of [...new Set(posts.map(post => post.date))]) dateChoice.add(new Option(date, date));
    function paint() {
      const shown = posts.filter(post => (!dateChoice.value || post.date === dateChoice.value) &&
        (!categoryChoice.value || post.category === categoryChoice.value));
      const filtered=Boolean(dateChoice.value || categoryChoice.value);
      reset.hidden=!filtered;
      output.classList.add("trend-grid");
      output.replaceChildren(...shown.map((post,index)=>trendStory(post,index===0 && !filtered)));
      if (!shown.length) output.append(element("p", "没有符合筛选条件的文章。", "notice"));
    }
    dateChoice.onchange = categoryChoice.onchange = paint;
    reset.onclick=()=>{dateChoice.value=categoryChoice.value="";paint();categoryChoice.focus();};
    paint();
  } catch (error) {
    if (!target.isConnected) return;
    output.replaceChildren(element("p", slug && error.status === 404 ? "这篇文章当前不在当季趋势中。" : "趋势文章暂时无法显示。", "notice"));
    if (slug) {
      const back = element("a", "返回全部趋势文章", "text-action");
      back.href = "#trends";
      output.append(back);
    }
  }
}
function feed(path, timeout = 12000) {
  if (!feeds.has(path)) {
    feeds.set(path, fetch(path, { signal: AbortSignal.timeout(timeout) }).then(response => {
      if (!response.ok) throw Object.assign(new Error("feed"), { status:response.status });
      return response.json();
    }).catch(error => { feeds.delete(path); throw error; }));
  }
  return feeds.get(path);
}
function readPublicContests() {
  contestCatalog ??= feed("./public-contests.json", 4000)
    .catch(() => request({ memberAction: "communityContests" }))
    .catch(error => { contestCatalog = undefined; throw error; });
  return contestCatalog;
}
function element(tag, value, className) {
  const node = document.createElement(tag);
  if (value) node.textContent = value;
  if (className) node.className = className;
  return node;
}
function addSource(parent, source) {
  try {
    const url = new URL(source.url);
    if (url.protocol !== "https:" || url.username || url.password) return;
    const anchor = element("a", source.title, "text-action");
    anchor.href = url.href;
    anchor.rel = "noreferrer";
    anchor.target = "_blank";
    parent.append(anchor);
  } catch { /* Malformed source references are omitted. */ }
}
function runwayPhoto(photo,photos,index) {
  const figure=element("figure",null,"home-runway-photo");
  const img=element("img");
  img.src=photo.url;
  img.alt=photo.alt;
  img.decoding="async";
  if(index===0) img.fetchPriority="high";
  const caption=element("figcaption",photo.credit+" · ");
  addSource(caption,{title:photo.license,url:photo.licenseUrl});
  caption.append(" · ");
  addSource(caption,{title:"原图",url:photo.sourceUrl});
  figure.append(photoTrigger(img,photos,index),caption);
  return figure;
}
async function showHomeRunways(target) {
  const coverPromise = feed("./home-runway.json?view=current").catch(()=>[]);
  const postsPromise = feed("./trend-articles.json?view=current").catch(()=>[]);
  const [cover] = await coverPromise;
  if (!target.isConnected) return;
  if (cover) {
    const hero = target.querySelector(".public-cover-art");
    hero.removeAttribute("aria-hidden");
    hero.replaceChildren(...cover.images.map((photo,index)=>runwayPhoto(photo,cover.images,index)));
    target.querySelector(".cover-season").textContent=cover.brand+" · "+cover.season;
    target.querySelector(".cover-intro").textContent=cover.reason;
    const action=target.querySelector(".cover-action");
    action.href=articleLink(cover.slug);
    action.textContent="阅读秀场观察";
  }
  const posts = await postsPromise;
  if (!target.isConnected) return;
  const picks = posts.filter(post=>post.slug!==cover?.slug).slice(0,3);
  const grid = target.querySelector(".home-runway-grid");
  grid.replaceChildren(...picks.map(post=>trendStory(post,false)));
  target.querySelector(".home-runways").hidden=!picks.length;
}
function entry() {
  surface = "public";
  const current = wantsAdmin() && !account && !accessRoutes.has(publicRoute()) ? "login" : publicRoute();
  const access = accessRoutes.has(current);
  if (access && document.getElementById("public-content")) {
    showAccess(current);
    return;
  }
  const route = access ? "home" : current;
  pageHash = access ? "#home" : location.hash;
  const activeSection = route;
  const navigation = sections.map(([key, label]) =>
    `<a href="${account?.premium && lockedSections.has(key) ? "/" : ""}#${key}"${activeSection === key ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  let content;
  const readTrends = route === "trends";
  const communityPage = communityRoutes.get(route);
  const readCommunity = communityPage && (account || route !== "profile");
  if (readTrends) {
    const detail = Boolean(sectionDetail());
    content = `${detail ? "" : `<div class="section-title"><h1>流行趋势</h1><p>每日一篇秀场观察，按日期与主题选读。</p></div>
      <div class="trend-article-filters">
        <div class="trend-filter"><label for="trend-date">发布日期</label><select id="trend-date"><option value="">全部日期</option></select></div>
        <div class="trend-filter"><label for="trend-article-category">主题</label><select id="trend-article-category"><option value="">全部主题</option>
          ${categories.map(([key,title]) => `<option value="${key}">${title}</option>`).join("")}</select></div>
        <button class="text-action" type="button" id="trend-clear" hidden>清除筛选</button>
      </div>`}
      <section class="trend-articles" aria-label="趋势文章"><p class="notice" role="status">正在读取文章…</p></section>`;
  } else if (communityPage) {
    content = readCommunity ? '<p class="notice" role="status">正在读取…</p>' :
      `<div class="section-title"><h1>${communityPage[0]}</h1></div>${lockedPreview("请先登录", "普通会员和高级会员均可使用。", '<a class="primary" href="#login">会员登录</a>')}`;
  } else if (lockedSections.has(route)) {
    const title = sections.find(([key]) => key === route)[1];
    content = `<div class="section-title"><h1>${title}</h1></div>${preview(route)}
      ${lockedPreview("高级会员专享", "通过管理员授权后，可查看完整内容。", premiumLink())}`;
  } else if (route === "upgrade") {
    content = `<section class="member-panel public-access"><h1>申请高级会员</h1>
      <p>提交申请后，管理员将收到邮件。获得授权后即可查看完整品牌档案、美妆和线稿工作台。</p>
      <div class="member-actions">${account ? (account.premium ? '<a class="primary" href="#profile">已开通高级会员</a>' :
        '<button class="primary" type="button" id="apply-premium">提交申请</button>') : '<a class="primary" href="#login">会员登录</a>'}</div>
      <p class="member-message" id="member-message" role="status"></p></section>`;
  } else {
    content = `<article class="cover-story public-cover" aria-labelledby="public-cover-title">
      <div class="public-cover-art" aria-hidden="true"><span></span><span></span></div>
      <div class="cover-copy"><p class="eyebrow">秀场推荐</p>
      <h1 id="public-cover-title">从秀场读设计</h1><p class="cover-season"></p>
      <p class="cover-intro">品牌档案、美妆观察与每日趋势长文。</p>
      <a class="primary cover-action" href="#trends">查看流行趋势</a></div></article>
      <section class="home-runways" aria-labelledby="home-runway-title" hidden>
      <div class="section-title"><h2 id="home-runway-title">本季趋势选读</h2>
      <a class="text-action" href="#trends">全部趋势文章</a></div>
      <div class="home-runway-grid"></div></section>`;
  }
  root.innerHTML = `<a class="skip-main" href="#public-content">跳到正文</a>
    <header class="topbar public-masthead${activeSection==="home"?"":" topbar-compact"}">
    <div class="masthead-tools"><div class="masthead-account">${account ?
      `<a class="subscribe-link" href="#profile">个人中心</a>${account.admin===true ? '<a class="text-action" href="/?panel=admin">会员管理</a>' : ""}` :
      '<a class="subscribe-link" href="#login">登录</a>'}</div><a class="subscribe-link" href="#subscribe" aria-haspopup="dialog">免费订阅</a></div>
    <a class="wordmark" href="#home" aria-label="ÉLAN 首页">ÉLAN</a>
    <nav aria-label="主导航">${navigation}</nav></header>
    <main id="public-content" tabindex="-1">${content}</main>
    <footer class="site-footer public-footer"><a class="footer-wordmark" href="#home" aria-label="ÉLAN 首页">ÉLAN</a>
    <nav aria-label="页脚导航"><a href="#trends">流行趋势</a><a href="#contests">服装设计大赛</a><a href="#square">设计广场</a>
    <a href="${account?"#profile":"#login"}">${account?"个人中心":"会员登录"}</a></nav></footer>`;
  root.querySelector(".skip-main").onclick=event=>{
    event.preventDefault();
    const main=document.getElementById("public-content");
    main.focus();
    main.scrollIntoView();
  };
  if (readTrends) void showTrendArticles(document.getElementById("public-content"));
  if (route === "home") void showHomeRunways(document.getElementById("public-content"));
  const sample = root.querySelector(".tier-preview img");
  if (sample) {
    const parent = sample.parentNode;
    const next = sample.nextSibling;
    const trigger = photoTrigger(sample,[{url:sample.src,alt:sample.alt}],0);
    parent.insertBefore(trigger,next);
  }
  if (readCommunity) {
    const target = document.getElementById("public-content");
    target.replaceChildren();
    void communityPage[1](target);
  }
  const apply=document.getElementById("apply-premium");
  if(apply) {
    apply.disabled=true;
    request({memberAction:"communityAccount"}).then(data=>{
      if(data.premiumPending) { apply.textContent="已申请 · 待审核"; }
      else apply.disabled=false;
    },()=>{apply.disabled=false;});
    apply.onclick=async()=>{
      apply.disabled=true;
      try {
        await request({memberAction:"communityRequestPremium"});
        apply.textContent="已申请 · 待审核";
      } catch(error) {
        if(apply.isConnected) message(error.message);
        apply.disabled=false;
      }
    };
  }
  window.scrollTo(0, 0);
  if (access) showAccess(current);
}
function confirmLink(action, id, token) {
  const unsubscribe = action === "unsubscribe";
  const title = unsubscribe ? "确认退订" : "确认订阅";
  panel(title, "确认后将更新周报发送设置。", `<form id="mail-form"><button class="primary" type="submit">${title}</button></form>`);
  bindForm("mail-form", async () => {
    await request({ action, id, token }, undefined, "");
    document.getElementById("mail-form").remove();
    message(unsubscribe ? "已退订 ÉLAN 周报。" : "已确认订阅 ÉLAN 周报。");
  });
}
function setPasswordPage(id, token) {
  panel("设置密码", "密码至少 12 个字符。设置后请用邮箱和新密码登录。", `
    <form id="set-password-form">
      <label for="new-password">新密码</label>
      <input id="new-password" name="password" type="password" autocomplete="new-password" required minlength="12" maxlength="512">
      <label for="repeat-password">确认密码</label>
      <input id="repeat-password" name="repeat" type="password" autocomplete="new-password" required minlength="12" maxlength="512">
      <button class="primary" type="submit">保存密码</button>
    </form>
    <p><a class="text-action" href="/?account=1#register">重新注册</a> · <a class="text-action" href="/?account=1#reset">重新申请重置</a></p>`);
  bindForm("set-password-form", async data => {
    if (data.get("password") !== data.get("repeat")) throw new Error("两次输入的密码不同。");
    await request({memberAction:"setPassword", id, token, password:data.get("password")}, undefined, "");
    sessionStorage.removeItem(storageKey);
    session = "";
    account = null;
    history.replaceState(null, "", "/#login");
    entry();
    message("密码已保存，请登录。");
  });
}
function startSession(token) {
  if (!sessionPattern.test(token)) throw new Error("登录状态无效，请重新登录。");
  session = token;
  sessionStorage.setItem(storageKey, token);
}
async function loadMember() {
  panel("会员中心", "正在读取会员权限…", "");
  try {
    const profile = await request({ memberAction: "profile" });
    account = profile;
    if (profile.admin===true && wantsAdmin()) await adminPanel(profile);
    else if(wantsAdmin()) {
      history.replaceState(null,"","/#profile");
      entry();
    }
    else if (profile.premium && lockedSections.has(publicRoute())) await openArchive(profile);
    else entry();
  } catch (error) {
    if ([401,403].includes(error.status)) {
      sessionStorage.removeItem(storageKey);
      session = "";
      account = null;
      entry();
      return;
    }
    panel("会员中心", "会员权限暂时无法加载。", '<button class="primary" id="retry-member" type="button">重新加载</button>');
    document.getElementById("retry-member").onclick = () => void loadMember();
  }
}
async function logout() {
  try { await request({ memberAction: "logout" }); }
  finally {
    sessionStorage.removeItem(storageKey);
    window.location.replace("/");
  }
}
async function openArchive(profile) {
  const { script } = await request({ memberAction: "app" });
  window.elanMember = {
    email: profile.email,
    session,
    request,
    favorite(kind,id) { return favoriteControl(request,kind,id); },
    photo(url) {
      if (!/^https:\/\//i.test(url) || url.startsWith(api + "?")) return url;
      return api + "?" + new URLSearchParams({ picture: "1", src: url });
    },
  };
  surface = "member";
  root.replaceChildren();
  const app = URL.createObjectURL(new Blob([script], { type: "text/javascript" }));
  try { await import(app); } finally { URL.revokeObjectURL(app); }
  enableMemberPhotoZoom(root);
  const signout = document.createElement("button");
  signout.type = "button";
  signout.className = "member-exit";
  signout.textContent = "退出";
  signout.onclick = () => void logout();
  root.after(signout);
  if (profile.admin===true) {
    const admin = document.createElement("a");
    admin.className = "member-exit member-admin-link";
    admin.href = "/?panel=admin";
    admin.textContent = "会员管理";
    signout.after(admin);
  }
}
async function adminPanel(profile) {
  panel("会员管理", "只有管理员可授予或撤销高级会员资格。", `
    <div class="member-actions">
      <a class="member-secondary" href="/">查看档案</a>
      <a class="member-secondary" href="/?section=account#profile">个人中心</a>
      <button class="member-secondary" id="exit-admin" type="button">退出</button>
    </div>
    <form id="approve-form">
      <label for="approve-email">授权高级会员邮箱</label>
      <input id="approve-email" name="email" type="email" required maxlength="254">
      <button class="primary" type="submit">授予高级会员</button>
    </form>
    <label for="member-state">按状态查看</label>
    <select id="member-state"><option value="pending">待审高级会员申请</option><option value="standard">普通会员</option><option value="approved">高级会员</option></select>
    <ul id="members" class="member-list"></ul>
    <section id="certification-review" class="community-admin"></section>`);
  document.getElementById("exit-admin").onclick = () => void logout();
  const state = document.getElementById("member-state");
  const list = document.getElementById("members");
  async function refresh() {
    const current = state.value;
    const members = current==="pending" ? (await request({memberAction:"communityPremiumQueue"})).items :
      (await request({memberAction:"members",state:current})).members;
    if (current !== state.value) return;
    list.replaceChildren();
    for (const member of members) {
      if (member.email === profile.email) continue;
      const row = document.createElement("li");
      const address = document.createElement("span");
      address.textContent = member.email;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "member-secondary";
      button.textContent = current === "approved" ? "降为普通会员" : "授予高级会员";
      button.onclick = async () => {
        button.disabled = true;
        try {
          await request({ memberAction: current === "approved" ? "revoke" : "approve", email: member.email });
          await refresh();
          message("权限已更新。");
        } catch (error) { message(error.message); button.disabled = false; }
      };
      row.append(address, button);
      list.append(row);
    }
    if (!list.childElementCount) {
      const row = document.createElement("li");
      row.textContent = "暂无记录。";
      list.append(row);
    }
  }
  state.onchange = () => refresh().catch(error => message(error.message));
  bindForm("approve-form", async data => {
    await request({ memberAction: "approve", email: data.get("email") });
    document.getElementById("approve-form").reset();
    await refresh();
    message("权限已开通。");
  });
  void renderReviewQueue(document.getElementById("certification-review"),request);
  await refresh().catch(error => message(error.message));
}
const setup = setPasswordPattern.exec(location.hash);
const newsletter = /^#newsletter\/(confirm|unsubscribe)\/([a-f0-9]{64})\/([A-Za-z0-9_-]{43})$/.exec(location.hash);
root.addEventListener("click", event => {
  if (!(event.target instanceof Element)) return;
  const trigger = event.target.closest('a[href="#subscribe"]');
  if (!trigger || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  showAccess("subscribe", trigger);
});
root.addEventListener("click", event => {
  if (surface !== "member" || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (!(event.target instanceof Element) || !event.target.closest('a[href="#home"]')) return;
  event.preventDefault();
  event.stopPropagation();
  window.location.assign(location.search ? "/#home" : "/?editorial=1#home");
}, true);
window.addEventListener("hashchange", () => {
  if (surface !== "public") return;
  const route = publicRoute();
  if (account?.premium && lockedSections.has(route)) {
    if (location.search) history.replaceState(null, "", "/" + location.hash);
    void loadMember();
  } else entry();
});
if (setup) {
  history.replaceState(null, "", "/");
  setPasswordPage(setup[1], setup[2]);
}
else if (newsletter) confirmLink(newsletter[1], newsletter[2], newsletter[3]);
else if (session) void loadMember();
else entry();
