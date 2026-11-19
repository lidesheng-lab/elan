const api = "https://elan-d8gtdxsaw5a7788d2-1507516836.ap-shanghai.app.tcloudbase.com/newsletter";
const storageKey = "elan-member-session";
const root = document.getElementById("root");
const sessionPattern = /^[A-Za-z0-9_-]{43}$/;
const loginPattern = /^#member-login\/([a-f0-9]{64})\/([A-Za-z0-9_-]{43})$/;
const loginChannel = typeof BroadcastChannel === "function" ? new BroadcastChannel("elan-member-login") : null;
let session = sessionStorage.getItem(storageKey) || "";
let awaitingLogin = "";
let surface = "public";
const sections = [
  ["home", "首页"], ["designers", "品牌索引"], ["beauty", "美妆"], ["trends", "流行趋势"], ["studio", "线稿工作台"],
];
const lockedSections = new Set(["designers", "beauty", "studio"]);
const categories = [["color", "色彩趋势"], ["fabric", "面料趋势"], ["silhouette", "廓形趋势"]];
const feeds = new Map();

async function request(body, signal, credentials = session) {
  const headers = { "Content-Type": "application/json" };
  if (credentials) headers.Authorization = "Bearer " + credentials;
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
  const status = document.getElementById("member-message");
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
    catch (error) { message(error.message); }
    finally { button.disabled = false; }
  });
}
function accessForm() {
  return `
    <form id="access-form">
      <label for="member-email">邮箱地址</label>
      <input id="member-email" name="email" type="email" autocomplete="email" required maxlength="254" placeholder="name@example.com">
      <div class="member-actions">
        <button class="primary" type="submit" value="login">发送登录邮件</button>
        <button class="member-secondary" type="submit" value="apply">申请会员</button>
      </div>
    </form>
    <details class="member-link-fallback">
      <summary>在当前浏览器完成登录</summary>
      <form id="paste-login-form">
        <label for="paste-login">粘贴邮件里的完整登录链接</label>
        <input id="paste-login" name="link" required maxlength="2048" type="url" autocomplete="off">
        <button class="member-secondary" type="submit">验证并登录</button>
      </form>
    </details>`;
}
function bindAccess() {
  bindForm("access-form", async (data, button) => {
    const action = button.value;
    if (action === "login" && loginChannel) {
      const bytes = new TextEncoder().encode(String(data.get("email")).trim().toLowerCase());
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      awaitingLogin = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    }
    await request({ memberAction: action, email: data.get("email") }, undefined, "");
    message(action === "apply" ? "申请已登记，请联系管理员审核。" : "请查收登录邮件。同一浏览器确认后，这一页会自动打开会员档案。");
  });
  bindForm("paste-login-form", async data => {
    const url = new URL(String(data.get("link")).trim());
    const parts = loginPattern.exec(url.hash);
    if (url.origin !== location.origin || url.username || url.password || !parts) throw new Error("请粘贴 ÉLAN 邮件里的完整登录链接。");
    await exchangeLogin(parts[1], parts[2]);
  });
}

function publicRoute() {
  const route = location.hash.slice(1);
  return sections.some(([key]) => key === route) || route === "login" || route === "subscribe" ? route : "home";
}
function feed(path) {
  if (!feeds.has(path)) {
    feeds.set(path, fetch(path, { signal: AbortSignal.timeout(12000) }).then(response => {
      if (!response.ok) throw new Error("feed");
      return response.json();
    }).catch(error => { feeds.delete(path); throw error; }));
  }
  return feeds.get(path);
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
async function showHeadlines(target) {
  try {
    const edition = await feed("./weekly-editorial.json");
    const headlines = Array.isArray(edition.headlines) ? edition.headlines : [];
    if (!target.isConnected || !headlines.length) return;
    target.hidden = false;
    target.append(element("h2", "本周时尚资讯"));
    const grid = element("div", null, "public-news-grid");
    for (const item of headlines) {
      const article = element("article", null, "public-news-card");
      article.append(element("h3", item.title), element("p", item.summary));
      if (item.source) addSource(article, item.source);
      grid.append(article);
    }
    target.append(grid);
  } catch { /* The home page and subscription stay usable. */ }
}
function trendCategory(item) {
  if (categories.some(([key]) => key === item.category)) return item.category;
  if (/色彩/.test(item.kind ?? "")) return "color";
  return /廓形|造型/.test(item.kind ?? "") ? "silhouette" : "fabric";
}
async function showTrends(target) {
  const output = target.querySelector(".trend-list");
  const results = await Promise.allSettled([feed("./public-trends.json"), feed("./weekly-editorial.json")]);
  if (!target.isConnected) return;
  const [baseline, editorial] = results.map(result => result.status === "fulfilled" ? result.value : null);
  const list = [...(editorial?.trends || []), ...(baseline || [])]
    .filter((item, index, all) => all.findIndex(other => other.id === item.id) === index);
  if (!list.length) {
    output.replaceChildren(element("p", "趋势暂时无法显示，请稍后再试。", "notice"));
    return;
  }
  function paint(category) {
    output.replaceChildren();
    for (const item of list.filter(note => trendCategory(note) === category)) {
      const article = element("article", null, "trend public-trend");
      const copy = element("div");
      copy.append(element("p", [item.season, item.kind].filter(Boolean).join(" · "), "eyebrow"),
        element("h2", item.title), element("p", item.description));
      if (item.application) copy.append(element("p", "应用建议：" + item.application, "public-application"));
      for (const source of item.sources || []) addSource(copy, source);
      article.append(copy);
      const palette = element("div", null, "palette");
      for (const color of item.palette || []) {
        if (!/^#[0-9a-f]{6}$/i.test(color.hex)) continue;
        const swatch = element("div");
        const block = element("span");
        block.style.backgroundColor = color.hex;
        swatch.append(block, element("small", color.name));
        palette.append(swatch);
      }
      article.append(palette);
      output.append(article);
    }
    if (!output.childElementCount) output.append(element("p", "暂无此类趋势更新。", "notice"));
    for (const button of target.querySelectorAll("[data-category]")) {
      button.setAttribute("aria-pressed", String(button.dataset.category === category));
    }
  }
  for (const button of target.querySelectorAll("[data-category]")) button.onclick = () => paint(button.dataset.category);
  paint("color");
}
function entry() {
  surface = "public";
  const route = publicRoute();
  const navigation = sections.map(([key, label]) =>
    `<a href="#${key}" aria-current="${(route === "subscribe" ? "home" : route) === key ? "page" : "false"}"${lockedSections.has(key) ? ' aria-label="' + label + '，会员专享"' : ""}>${label}${lockedSections.has(key) ? '<span class="public-lock" aria-hidden="true"></span>' : ""}</a>`).join("");
  let content;
  if (route === "trends") {
    content = `<div class="section-title"><h1>流行趋势</h1><p>按色彩、面料和廓形查看每季观察。</p></div>
      <div class="pills trend-categories" aria-label="趋势分类">${categories.map(([key, title]) =>
        `<button type="button" data-category="${key}" aria-pressed="${key === "color"}">${title}</button>`).join("")}</div>
      <div class="trend-list"><p class="notice" role="status">正在读取趋势…</p></div>`;
  } else if (lockedSections.has(route) || route === "login") {
    const title = route === "login" ? "会员登录" : sections.find(([key]) => key === route)[1];
    content = `<section class="member-panel public-access">
      <h1>${title}</h1><p>更多权益请联系管理员申请成为会员。微信 LDSH557788。</p>
      ${accessForm()}<p class="member-message" role="status" id="member-message"></p></section>`;
  } else {
    content = `<article class="cover-story public-cover" aria-labelledby="public-cover-title">
      <div class="public-cover-art" aria-hidden="true"><span></span><span></span></div>
      <div class="cover-copy"><p class="eyebrow">封面专题 <span>2027 春夏</span></p>
      <h1 id="public-cover-title">剪裁的<br>留白</h1>
      <p class="cover-intro">从面料的硬挺、垂坠和透明度，观察衣服如何在身体周围形成空间。</p>
      <a class="primary cover-action" href="#trends">查看流行趋势</a></div></article>
      <section class="public-news" id="public-news" hidden></section>`;
  }
  root.innerHTML = `<header class="topbar">
    <div class="masthead-tools"><a class="subscribe-link" href="#login">会员登录</a><a class="subscribe-link" href="#subscribe">免费订阅</a></div>
    <a class="wordmark" href="#home" aria-label="ÉLAN 首页">ÉLAN</a>
    <nav aria-label="主导航">${navigation}</nav></header>
    <main id="public-content">${content}</main>
    <div class="subscribe-wrap" id="subscribe"><section class="subscribe-section" aria-labelledby="public-subscribe-title">
      <div><h2 id="public-subscribe-title">免费订阅</h2><p>每周时尚资讯与流行趋势。登记后请确认邮箱，邮件内可退订。</p></div>
      <form id="public-subscribe-form"><label for="public-email">订阅邮箱</label>
      <div class="subscribe-fields"><input id="public-email" name="email" type="email" required maxlength="254" autocomplete="email" placeholder="name@example.com">
      <button class="primary" type="submit">免费订阅</button></div>
      <p class="member-message" id="public-subscribe-status" role="status"></p></form>
    </section></div>
    <footer class="site-footer"><a class="footer-wordmark" href="#home">ÉLAN</a><nav aria-label="页脚导航"><a href="#trends">流行趋势</a><a href="#login">会员登录</a></nav></footer>`;
  if (document.getElementById("access-form")) bindAccess();
  const form = document.getElementById("public-subscribe-form");
  form.onsubmit = async event => {
    event.preventDefault();
    const button = form.querySelector("button");
    const status = document.getElementById("public-subscribe-status");
    button.disabled = true;
    status.textContent = "正在登记…";
    try {
      await request({ email: new FormData(form).get("email") }, undefined, "");
      status.textContent = "邮箱已登记。首次订阅请查收确认邮件。";
      form.reset();
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
  };
  if (route === "trends") void showTrends(document.getElementById("public-content"));
  else if (document.getElementById("public-news")) void showHeadlines(document.getElementById("public-news"));
  if (route === "subscribe") document.getElementById("subscribe").scrollIntoView();
  else window.scrollTo(0, 0);
}
function confirmLink(action, id, token) {
  const login = action === "exchange";
  const unsubscribe = action === "unsubscribe";
  const title = login ? "确认登录" : unsubscribe ? "确认退订" : "确认订阅";
  panel(title, login ? "确认后即可使用与你邮箱绑定的会员权限。" : "确认后将更新周报发送设置。",
    `<form id="mail-form"><button class="primary" type="submit">${title}</button></form>`);
  bindForm("mail-form", async () => {
    if (login) {
      await exchangeLogin(id, token);
      return;
    }
    await request({ action, id, token }, undefined, "");
    document.getElementById("mail-form").remove();
    message(unsubscribe ? "已退订 ÉLAN 周报。" : "已确认订阅 ÉLAN 周报。");
  });
}
function startSession(token) {
  if (!sessionPattern.test(token)) throw new Error("登录状态无效，请重新发送登录邮件。");
  session = token;
  sessionStorage.setItem(storageKey, token);
  awaitingLogin = "";
}
async function loadMember() {
  panel("会员档案", "正在读取档案…", "");
  try {
    await openMember();
  } catch (error) {
    if (error.status === 403) {
      sessionStorage.removeItem(storageKey);
      session = "";
      history.replaceState(null, "", "/#login");
      entry();
      message("登录状态已失效，请重新发送登录邮件。");
      return;
    }
    panel("会员档案", "会员档案暂时无法加载。", '<button class="primary" id="retry-member" type="button">重新加载</button>');
    document.getElementById("retry-member").onclick = () => void loadMember();
  }
}
async function exchangeLogin(id, token) {
  const result = await request({ memberAction: "exchange", id, token }, undefined, "");
  startSession(result.session);
  loginChannel?.postMessage({ id, session });
  if (loginPattern.test(location.hash) || location.hash === "#login") history.replaceState(null, "", "/");
  await loadMember();
}
if (loginChannel) loginChannel.onmessage = event => {
  if (!awaitingLogin || event.data?.id !== awaitingLogin || !document.getElementById("access-form") || !sessionPattern.test(event.data?.session)) return;
  startSession(event.data.session);
  if (location.hash === "#login") history.replaceState(null, "", "/");
  void loadMember();
};
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
    photo(url) {
      if (!/^https:\/\//i.test(url) || url.startsWith(api + "?")) return url;
      return api + "?" + new URLSearchParams({ picture: "1", src: url });
    },
  };
  surface = "member";
  root.replaceChildren();
  const app = URL.createObjectURL(new Blob([script], { type: "text/javascript" }));
  try { await import(app); } finally { URL.revokeObjectURL(app); }
  const signout = document.createElement("button");
  signout.type = "button";
  signout.className = "member-exit";
  signout.textContent = "退出";
  signout.onclick = () => void logout();
  root.after(signout);
  if (profile.admin) {
    const admin = document.createElement("a");
    admin.className = "member-exit member-admin-link";
    admin.href = "/?panel=admin";
    admin.textContent = "会员管理";
    signout.after(admin);
  }
}
async function adminPanel(profile) {
  panel("会员管理", "只有管理员可以授权或撤销邮箱的访问权限。", `
    <div class="member-actions">
      <a class="member-secondary" href="/">查看档案</a>
      <button class="member-secondary" id="exit-admin" type="button">退出</button>
    </div>
    <form id="approve-form">
      <label for="approve-email">授权邮箱</label>
      <input id="approve-email" name="email" type="email" required maxlength="254">
      <button class="primary" type="submit">批准访问</button>
    </form>
    <label for="member-state">按状态查看</label>
    <select id="member-state"><option value="pending">待审批</option><option value="approved">已授权</option><option value="revoked">已撤销</option></select>
    <ul id="members" class="member-list"></ul>`);
  document.getElementById("exit-admin").onclick = () => void logout();
  const state = document.getElementById("member-state");
  const list = document.getElementById("members");
  async function refresh() {
    const current = state.value;
    const { members } = await request({ memberAction: "members", state: current });
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
      button.textContent = current === "approved" ? "撤销权限" : "批准访问";
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
  await refresh();
}
async function openMember() {
  const profile = await request({ memberAction: "profile" });
  if (profile.admin && new URLSearchParams(location.search).get("panel") === "admin") await adminPanel(profile);
  else await openArchive(profile);
}

const login = loginPattern.exec(location.hash);
const newsletter = /^#newsletter\/(confirm|unsubscribe)\/([a-f0-9]{64})\/([A-Za-z0-9_-]{43})$/.exec(location.hash);
window.addEventListener("hashchange", () => { if (surface === "public") entry(); });
if (login) confirmLink("exchange", login[1], login[2]);
else if (newsletter) confirmLink(newsletter[1], newsletter[2], newsletter[3]);
else if (session) void loadMember();
else entry();
