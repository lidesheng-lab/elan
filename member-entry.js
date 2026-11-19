const api = "https://elan-d8gtdxsaw5a7788d2-1507516836.ap-shanghai.app.tcloudbase.com/newsletter";
const storageKey = "elan-member-session";
const root = document.getElementById("root");
const sessionPattern = /^[A-Za-z0-9_-]{43}$/;
const setPasswordPattern = /^#set-password\/([a-f0-9]{64})\/([A-Za-z0-9_-]{43})$/;
let session = sessionStorage.getItem(storageKey) || "";
let account = null;
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
function accessForm(mode) {
  const login = mode === "login";
  const label = login ? "登录" : mode === "register" ? "发送注册邮件" : "发送重置邮件";
  return `
    <form id="access-form">
      <label for="member-email">邮箱地址</label>
      <input id="member-email" name="email" type="email" autocomplete="username" required maxlength="254">
      ${login ? '<label for="member-password">密码</label><input id="member-password" name="password" type="password" autocomplete="current-password" required maxlength="512">' : ""}
      <button class="primary" type="submit">${label}</button>
    </form>
    <div class="member-actions">
      ${login ? '<a class="text-action" href="#register">注册普通会员</a><a class="text-action" href="#reset">忘记密码</a>'
        : '<a class="text-action" href="#login">返回登录</a>'}
    </div>`;
}
function bindAccess(mode) {
  bindForm("access-form", async data => {
    const email = data.get("email");
    if (mode === "login") {
      const result = await request({ memberAction: "passwordLogin", email, password: data.get("password") }, undefined, "");
      startSession(result.session);
      history.replaceState(null, "", "/#trends");
      await loadMember({welcome:true});
    } else {
      await request({ memberAction: mode, email }, undefined, "");
      message(mode === "register" ? "请查收注册邮件，验证邮箱并设置密码后即可登录。" : "如果邮箱已注册，请查收重置邮件。");
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
  const route = location.hash.slice(1);
  if (/^trends\/[a-z0-9-]+$/.test(route)) return "trends";
  return sections.some(([key]) => key === route) || ["login","register","reset","subscribe","upgrade"].includes(route) ? route : "home";
}
function articleLink(slug) { return "#trends/" + slug; }
function renderTrendArticle(output, post) {
  const article = element("article", null, "trend-feature");
  const back = element("a", "← 全部趋势文章", "text-action");
  back.href = "#trends";
  const date = element("time", post.date);
  date.dateTime = post.date;
  const meta = element("p", null, "eyebrow");
  meta.append(date, " · " + post.season + " · " + categories.find(([key]) => key === post.category)[1]);
  article.append(back, meta, element("h1", post.title), element("p", post.lead, "trend-feature-lead"));
  const photos = element("div", null, "trend-feature-photos");
  for (const photo of post.images) {
    const figure = element("figure");
    const img = element("img");
    img.src = photo.url;
    img.alt = photo.alt;
    img.decoding = "async";
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    const caption = element("figcaption", photo.caption);
    figure.append(img, caption);
    photos.append(figure);
  }
  article.append(photos);
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
  output.replaceChildren(article);
}
async function showTrendArticles(target) {
  const output = target.querySelector(".trend-articles");
  const slug = location.hash.startsWith("#trends/") ? location.hash.slice(8) : "";
  try {
    const posts = await feed("./trend-articles.json");
    if (!target.isConnected) return;
    if (slug) {
      if (!posts.some(item => item.slug === slug)) throw new Error("Article unavailable");
      const post = await request({ memberAction: "trendArticle", slug });
      if (target.isConnected) renderTrendArticle(output, post);
      return;
    }
    const dateChoice = target.querySelector("#trend-date");
    const categoryChoice = target.querySelector("#trend-article-category");
    for (const date of [...new Set(posts.map(post => post.date))]) dateChoice.add(new Option(date, date));
    function paint() {
      const shown = posts.filter(post => (!dateChoice.value || post.date === dateChoice.value) &&
        (!categoryChoice.value || post.category === categoryChoice.value));
      output.replaceChildren();
      for (const post of shown) {
        const story = element("article", null, "trend-story");
        const title = element("a", post.title);
        title.href = articleLink(post.slug);
        const heading = element("h2");
        heading.append(title);
        story.append(element("p", post.date + " · " + post.season, "eyebrow"), heading);
        output.append(story);
      }
      if (!shown.length) output.append(element("p", "没有符合筛选条件的文章。", "notice"));
    }
    dateChoice.onchange = categoryChoice.onchange = paint;
    paint();
  } catch {
    if (!target.isConnected) return;
    output.replaceChildren(element("p", "趋势文章暂时无法显示。", "notice"));
    if (slug) {
      const back = element("a", "返回全部趋势文章", "text-action");
      back.href = "#trends";
      output.append(back);
    }
  }
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
function entry() {
  surface = "public";
  const route = publicRoute();
  const navigation = sections.map(([key, label]) =>
    `<a href="${account?.premium && lockedSections.has(key) ? "/" : ""}#${key}" aria-current="${(route === "subscribe" ? "home" : route) === key ? "page" : "false"}">${label}</a>`).join("");
  let content;
  const readTrends = route === "trends" && account;
  const accountRoutes = ["login","register","reset"];
  if (readTrends) {
    const detail = location.hash.startsWith("#trends/");
    content = `${detail ? "" : `<div class="section-title"><h1>流行趋势</h1><p>每日一篇秀场观察，按日期与主题选读。</p></div>
      <div class="trend-article-filters">
        <label for="trend-date">发布日期 <select id="trend-date"><option value="">全部日期</option></select></label>
        <label for="trend-article-category">主题 <select id="trend-article-category"><option value="">全部主题</option>
          ${categories.map(([key,title]) => `<option value="${key}">${title}</option>`).join("")}</select></label>
      </div>`}
      <section class="trend-articles" aria-label="趋势文章"><p class="notice" role="status">正在读取文章…</p></section>`;
  } else if (route === "trends") {
    content = `<div class="section-title"><h1>流行趋势</h1></div>${lockedPreview("趋势文章需要登录", "免费注册普通会员即可读每日文章。", '<a class="primary" href="#register">注册普通会员</a><a class="text-action" href="#login">登录</a>')}`;
  } else if (lockedSections.has(route)) {
    const title = sections.find(([key]) => key === route)[1];
    content = `<div class="section-title"><h1>${title}</h1></div>${preview(route)}
      ${lockedPreview("高级会员专享", "通过管理员授权后，可查看完整内容。", premiumLink())}`;
  } else if (accountRoutes.includes(route)) {
    const title = route === "login" ? "会员登录" : route === "register" ? "注册普通会员" : "找回密码";
    const help = route === "register" ? "验证邮箱并设置密码后，即可免费登录。" : route === "reset" ? "输入你的注册邮箱。" : "使用注册邮箱和密码登录。";
    content = `<section class="member-panel public-access"><h1>${title}</h1><p>${help}</p>
      ${accessForm(route)}<p class="member-message" role="status" id="member-message"></p></section>`;
  } else if (route === "upgrade") {
    content = `<section class="member-panel public-access"><h1>申请高级会员</h1>
      <p>请联系管理员，提供你的 ÉLAN 注册邮箱。管理员授权后即可查看完整品牌档案、美妆和线稿工作台。</p>
      <p><strong>微信 LDSH557788</strong></p>
      <div class="member-actions">${account ? '<a class="primary" href="/?refresh=1">刷新权限</a>' : '<a class="primary" href="#register">先注册普通会员</a>'}</div></section>`;
  } else {
    content = `<article class="cover-story public-cover" aria-labelledby="public-cover-title">
      <div class="public-cover-art" aria-hidden="true"><span></span><span></span></div>
      <div class="cover-copy"><p class="eyebrow">ÉLAN</p>
      <h1 id="public-cover-title">从秀场<br>读设计</h1>
      <p class="cover-intro">品牌档案、美妆观察与每日趋势长文。</p>
      <a class="primary cover-action" href="${account ? "#trends" : "#register"}">${account ? "查看流行趋势" : "免费注册"}</a></div></article>`;
  }
  root.innerHTML = `<header class="topbar">
    <div class="masthead-tools">${account ? `<a class="subscribe-link" href="${account.premium ? "/" : "#upgrade"}">${account.premium ? "高级会员" : "普通会员"}</a>${account.admin ? '<a class="subscribe-link" href="/?panel=admin">会员管理</a>' : ""}<button id="account-logout" class="subscribe-link" type="button">退出</button>` : '<a class="subscribe-link" href="#login">登录</a><a class="subscribe-link" href="#register">注册</a>'}<a class="subscribe-link" href="#subscribe">免费订阅</a></div>
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
  if (document.getElementById("access-form")) bindAccess(route);
  const exit = document.getElementById("account-logout");
  if (exit) exit.onclick = () => void logout();
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
  if (readTrends) void showTrendArticles(document.getElementById("public-content"));
  if (route === "subscribe") document.getElementById("subscribe").scrollIntoView();
  else window.scrollTo(0, 0);
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
async function loadMember({welcome = false} = {}) {
  panel("会员中心", "正在读取会员权限…", "");
  try {
    const profile = await request({ memberAction: "profile" });
    account = profile;
    if (profile.admin && new URLSearchParams(location.search).get("panel") === "admin") await adminPanel(profile);
    else if (profile.premium && !welcome && !["trends","register","reset","upgrade","login","subscribe"].includes(publicRoute())) await openArchive(profile);
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
  panel("会员管理", "只有管理员可授予或撤销高级会员资格。", `
    <div class="member-actions">
      <a class="member-secondary" href="/">查看档案</a>
      <button class="member-secondary" id="exit-admin" type="button">退出</button>
    </div>
    <form id="approve-form">
      <label for="approve-email">授权高级会员邮箱</label>
      <input id="approve-email" name="email" type="email" required maxlength="254">
      <button class="primary" type="submit">授予高级会员</button>
    </form>
    <label for="member-state">按状态查看</label>
    <select id="member-state"><option value="standard">普通会员</option><option value="approved">高级会员</option></select>
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
  await refresh();
}
const setup = setPasswordPattern.exec(location.hash);
const newsletter = /^#newsletter\/(confirm|unsubscribe)\/([a-f0-9]{64})\/([A-Za-z0-9_-]{43})$/.exec(location.hash);
window.addEventListener("hashchange", () => {
  if (surface !== "public") return;
  const route = publicRoute();
  if (account?.premium && (route === "home" || lockedSections.has(route))) {
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
